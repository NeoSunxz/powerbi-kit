"use strict";

/*
 * 日历热力图：一行一年，一格一天，颜色越深数值越大。
 * 只用 D3 画 SVG；文字一律 .text() 写入，不用 innerHTML；不联网、不存数据。
 * 提示框用 Power BI 原生 tooltipService，点选用 selectionManager 做交叉筛选。
 */

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import * as d3 from "d3";
import "./../style/visual.less";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import IVisualEventService = powerbi.extensibility.IVisualEventService;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ISelectionId = powerbi.visuals.ISelectionId;

import { VisualFormattingSettingsModel } from "./settings";
import ISandboxExtendedColorPalette = powerbi.extensibility.ISandboxExtendedColorPalette;

interface DayPoint {
    date: Date;
    key: string;       // yyyy-mm-dd
    value: number;
    selectionId: ISelectionId;
}

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

function dayKey(d: Date): string {
    const m = d.getMonth() + 1, day = d.getDate();
    return `${d.getFullYear()}-${m < 10 ? "0" : ""}${m}-${day < 10 ? "0" : ""}${day}`;
}

const numberFormat = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 });
function formatValue(v: number): string {
    return numberFormat.format(v);
}

function toDate(v: powerbi.PrimitiveValue): Date | null {
    if (v instanceof Date) return isNaN(v.getTime()) ? null : new Date(v.getFullYear(), v.getMonth(), v.getDate());
    if (typeof v === "string" && /^\d{4}-\d{1,2}-\d{1,2}/.test(v)) {
        const [y, m, d] = v.slice(0, 10).split("-").map(Number);
        return new Date(y, m - 1, d);
    }
    return null;  // 年、季度这类层级值不是完整日期
}

export class Visual implements IVisual {
    private host: IVisualHost;
    private events: IVisualEventService;
    private selectionManager: ISelectionManager;
    private formattingSettings: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;
    private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    private message: d3.Selection<HTMLDivElement, unknown, null, undefined>;

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.events = options.host.eventService;
        this.selectionManager = options.host.createSelectionManager();
        this.formattingSettingsService = new FormattingSettingsService();
        const root = d3.select(options.element);
        this.message = root.append("div").classed("hint", true);
        this.svg = root.append("svg").classed("calendar", true);
        // 点空白处清除选择；右键菜单交给 Power BI
        this.svg.on("click", () => this.selectionManager.clear().then(() => this.applySelection()));
        this.svg.on("contextmenu", (event: MouseEvent) => {
            this.selectionManager.showContextMenu({}, { x: event.clientX, y: event.clientY });
            event.preventDefault();
        });
        this.selectionManager.registerOnSelectCallback(() => this.applySelection());
    }

    public update(options: VisualUpdateOptions) {
        this.events.renderingStarted(options);
        try {
            const dv = options.dataViews && options.dataViews[0];
            this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(VisualFormattingSettingsModel, dv);
            this.syncSliceVisibility();
            const points = this.readData(dv);
            this.svg.selectAll("*").remove();
            if (!points) {
                this.showMessage("把一个日期字段放进「日期」，一个度量值放进「数值」。\n日期请选「日期」本身，不要选「日期层次结构」。");
            } else if (points.length === 0) {
                this.showMessage("没有能识别的日期。请在字段上右键，选「日期」而不是「日期层次结构」。");
            } else {
                this.message.style("display", "none");
                this.render(points, options.viewport.width, options.viewport.height);
            }
            this.events.renderingFinished(options);
        } catch (error) {
            this.events.renderingFailed(options, String(error));
        }
    }

    // 跟随主题时藏起取色器；图例选「文字」时才显示两端文字
    private syncSliceVisibility() {
        const c = this.formattingSettings.colorsCard, l = this.formattingSettings.legendCard;
        [c.lowColor, c.highColor, c.emptyColor].forEach(x => x.visible = !c.useTheme.value);
        const t = this.formattingSettings.textCard;
        t.color.visible = !t.useTheme.value;
        const textLabels = l.labelType.value.value === "text";
        l.lowText.visible = textLabels;
        l.highText.visible = textLabels;
    }

    // 高对比度模式用系统前景/背景色；跟随主题时最大值取主题第一个数据颜色，文字取主题的次要文字色
    private resolveColors() {
        const s = this.formattingSettings;
        const pal = this.host.colorPalette as ISandboxExtendedColorPalette;
        if (pal.isHighContrast) {
            const fg = pal.foreground.value, bg = pal.background.value;
            return { low: bg, high: fg, empty: bg, text: fg };
        }
        const themeText = pal.foregroundNeutralSecondary || pal.foreground;
        const text = s.textCard.useTheme.value && themeText ? themeText.value : s.textCard.color.value.value;
        if (s.colorsCard.useTheme.value) {
            // 最小值从卡片底色往最大值走 35%，没数据的格子从底色往文字色挪 10%：深色主题下少的日子不会比多的还亮
            const base = pal.background ? pal.background.value : "#FFFFFF";
            const ink = pal.foreground ? pal.foreground.value : "#252423";
            // 深色底上最大值提亮、提饱和度，像 GitHub 那样越多越亮
            const themeHigh = pal.getColor("calendarHeatmap").value;
            const dark = d3.hsl(base).l < 0.35;
            let high = themeHigh;
            if (dark) {
                const h = d3.hsl(themeHigh);
                h.l = Math.min(0.6, h.l + 0.14);
                h.s = Math.max(h.s, 0.7);
                high = h.formatHex();
            }
            return { low: d3.interpolateLab(base, high)(0.35), high, empty: d3.interpolateLab(base, ink)(0.1), text };
        }
        return { low: s.colorsCard.lowColor.value.value, high: s.colorsCard.highColor.value.value, empty: s.colorsCard.emptyColor.value.value, text };
    }

    private showMessage(text: string) {
        this.svg.attr("width", 0).attr("height", 0);
        this.message.style("display", "block").text(text);
    }

    private readData(dv: powerbi.DataView): DayPoint[] | null {
        const cat = dv && dv.categorical && dv.categorical.categories && dv.categorical.categories[0];
        const vals = dv && dv.categorical && dv.categorical.values && dv.categorical.values[0];
        if (!cat || !vals) return null;
        const out: DayPoint[] = [];
        cat.values.forEach((raw, i) => {
            const date = toDate(raw);
            const v = vals.values[i];
            if (!date || v === null || v === undefined || isNaN(Number(v))) return;
            out.push({
                date, key: dayKey(date), value: Number(v),
                selectionId: this.host.createSelectionIdBuilder().withCategory(cat, i).createSelectionId()
            });
        });
        return out;
    }

    private render(points: DayPoint[], width: number, height: number) {
        const s = this.formattingSettings;
        const start = s.layoutCard.mondayFirst.value ? 1 : 0;
        const tf = s.textCard.font;
        const font = tf.fontSize.value;
        const colors = this.resolveColors();
        const lg = s.legendCard;
        const legendFont = lg.fontSize.value;
        const legendH = lg.show.value ? Math.max(lg.boxSize.value, legendFont * 1.3) + 8 : 0;
        const legendTop = lg.show.value && String(lg.position.value.value).startsWith("top");
        const showMonths = s.layoutCard.showMonths.value;
        const byKey = new Map(points.map(p => [p.key, p]));
        const years = Array.from(new Set(points.map(p => p.date.getFullYear()))).sort((a, b) => a - b);

        // 版面：左边留星期，每年上面一行放年份（左上角）和月份，图例在上或在下；格子保持正方形
        const left = font * 4.2, right = 8, top = 4 + (legendTop ? legendH : 0);
        const headH = font * 1.6, yearGap = font * 1.2;
        const cellW = (width - left - right) / 53;
        const cellH = (height - top - legendH - years.length * (headH + yearGap)) / (years.length * 7);
        const cell = Math.max(2, Math.min(cellW, cellH));
        const gap = Math.max(1, cell * 0.12);
        const blockH = headH + cell * 7 + yearGap;

        const values = points.map(p => p.value);
        const lo = d3.min(values), hi = d3.max(values);
        const color = d3.scaleSequential(d3.interpolateLab(colors.low, colors.high))
            .domain(lo === hi ? [lo - 1, hi] : [lo, hi]);
        const emptyColor = colors.empty;
        const radius = Math.min(s.layoutCard.cornerRadius.value, cell / 2);

        this.svg.attr("width", width).attr("height", height)
            .style("font-family", tf.fontFamily.value)
            .style("font-weight", tf.bold.value ? "bold" : "normal")
            .style("fill", colors.text);
        const g = this.svg.append("g").attr("transform", `translate(${left},${top})`);

        years.forEach((year, yi) => {
            const yg = g.append("g").attr("transform", `translate(0,${yi * blockH})`);
            const jan1 = new Date(year, 0, 1);
            const offset = (jan1.getDay() - start + 7) % 7;
            const days = d3.timeDays(jan1, new Date(year + 1, 0, 1));
            const col = (d: Date) => Math.floor((d3.timeDay.count(jan1, d) + offset) / 7);
            const row = (d: Date) => (d.getDay() - start + 7) % 7;

            yg.append("text").classed("year", true)
                .attr("x", -left + 2).attr("y", headH - font * 0.4)
                .attr("font-size", font).attr("font-weight", "bold").text(String(year));
            [0, 2, 4].forEach(r => yg.append("text").classed("weekday", true)
                .attr("x", -4).attr("y", headH + r * cell + cell / 2)
                .attr("font-size", font * 0.9).attr("text-anchor", "end").attr("dominant-baseline", "middle")
                .text(WEEKDAYS[(r + start) % 7]));
            if (showMonths) {
                d3.timeMonths(jan1, new Date(year + 1, 0, 1)).forEach(m => yg.append("text").classed("month", true)
                    .attr("x", col(m) * cell).attr("y", headH - font * 0.4)
                    .attr("font-size", font * 0.9).text(`${m.getMonth() + 1}月`));
            }

            yg.append("g").attr("transform", `translate(0,${headH})`)
                .selectAll("rect").data(days.map(d => byKey.get(dayKey(d)) || null).map((p, i) => ({ p, d: days[i] })))
                .enter().append("rect")
                .attr("x", x => col(x.d) * cell + gap / 2).attr("y", x => row(x.d) * cell + gap / 2)
                .attr("width", cell - gap).attr("height", cell - gap).attr("rx", radius)
                .attr("fill", x => x.p ? color(x.p.value) : emptyColor)
                .classed("day", x => !!x.p);
        });

        this.bindInteractions();
        if (lg.show.value) this.drawLegend(color, lo, hi, width, height, legendH);
        this.applySelection();
    }

    private bindInteractions() {
        const tooltip = (event: MouseEvent, p: DayPoint) => ({
            coordinates: [event.clientX, event.clientY],
            isTouchEvent: false,
            dataItems: [
                { displayName: "日期", value: `${p.key} 周${WEEKDAYS[p.date.getDay()]}` },
                { displayName: "数值", value: formatValue(p.value) }
            ],
            identities: [p.selectionId]
        });
        this.svg.selectAll<SVGRectElement, { p: DayPoint }>("rect.day")
            .on("mouseover", (event: MouseEvent, x) => this.host.tooltipService.show(tooltip(event, x.p)))
            .on("mousemove", (event: MouseEvent, x) => this.host.tooltipService.move(tooltip(event, x.p)))
            .on("mouseout", () => this.host.tooltipService.hide({ immediately: true, isTouchEvent: false }))
            .on("click", (event: MouseEvent, x) => {
                event.stopPropagation();
                this.selectionManager.select(x.p.selectionId, event.ctrlKey || event.metaKey)
                    .then(() => this.applySelection());
            })
            .on("contextmenu", (event: MouseEvent, x) => {
                event.stopPropagation();
                event.preventDefault();
                this.selectionManager.showContextMenu(x.p.selectionId, { x: event.clientX, y: event.clientY });
            });
    }

    private applySelection() {
        if (!this.svg) return;
        const ids = this.selectionManager.getSelectionIds() as ISelectionId[];
        this.svg.selectAll<SVGRectElement, { p: DayPoint }>("rect.day")
            .attr("opacity", x => !ids.length || ids.some(id => id.equals(x.p.selectionId)) ? 1 : 0.25);
    }

    private drawLegend(color: d3.ScaleSequential<string>, lo: number, hi: number,
        width: number, height: number, legendH: number) {
        const l = this.formattingSettings.legendCard;
        const n = Math.max(2, Math.min(10, Math.round(l.steps.value)));
        const size = Math.max(6, l.boxSize.value), font = l.fontSize.value, pad = 2;
        const pos = String(l.position.value.value);
        const useValues = l.labelType.value.value === "values";
        const lowLabel = useValues ? formatValue(lo) : l.lowText.value;
        const highLabel = useValues ? formatValue(hi) : l.highText.value;

        const g = this.svg.append("g").classed("legend", true).attr("font-size", font);
        const lowText = g.append("text").attr("dominant-baseline", "middle").text(lowLabel);
        const lowW = lowText.node().getComputedTextLength();
        const boxesX = lowW + 6;
        d3.range(n).forEach(i => g.append("rect")
            .attr("x", boxesX + i * (size + pad)).attr("y", -size / 2).attr("width", size).attr("height", size)
            .attr("rx", Math.min(3, size / 4)).attr("fill", color(lo + (hi - lo) * i / (n - 1))));
        const highText = g.append("text").attr("x", boxesX + n * (size + pad) + 4).attr("dominant-baseline", "middle").text(highLabel);
        const totalW = boxesX + n * (size + pad) + 4 + highText.node().getComputedTextLength();

        const x = pos.endsWith("Right") ? width - 8 - totalW : 8;
        const y = pos.startsWith("top") ? 4 + legendH / 2 - 4 : height - legendH / 2;
        g.attr("transform", `translate(${x},${y})`);
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}
