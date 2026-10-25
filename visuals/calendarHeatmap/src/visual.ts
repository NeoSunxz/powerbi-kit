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
        const font = s.layoutCard.fontSize.value;
        const showMonths = s.layoutCard.showMonths.value;
        const byKey = new Map(points.map(p => [p.key, p]));
        const years = Array.from(new Set(points.map(p => p.date.getFullYear()))).sort((a, b) => a - b);

        // 版面：左边留星期和年份，上面留月份，下面留图例；格子保持正方形
        const left = font * 4.2, right = 8, top = 4, legendH = font * 2.4;
        const monthH = showMonths ? font * 1.6 : 0, yearGap = font * 1.2;
        const cellW = (width - left - right) / 53;
        const cellH = (height - top - legendH - years.length * (monthH + yearGap)) / (years.length * 7);
        const cell = Math.max(2, Math.min(cellW, cellH));
        const gap = Math.max(1, cell * 0.12);
        const blockH = monthH + cell * 7 + yearGap;

        const values = points.map(p => p.value);
        const lo = d3.min(values), hi = d3.max(values);
        const color = d3.scaleSequential(d3.interpolateLab(s.colorsCard.lowColor.value.value, s.colorsCard.highColor.value.value))
            .domain(lo === hi ? [lo - 1, hi] : [lo, hi]);
        const emptyColor = s.colorsCard.emptyColor.value.value;
        const radius = Math.min(s.layoutCard.cornerRadius.value, cell / 2);

        this.svg.attr("width", width).attr("height", height);
        const g = this.svg.append("g").attr("transform", `translate(${left},${top})`);

        years.forEach((year, yi) => {
            const yg = g.append("g").attr("transform", `translate(0,${yi * blockH})`);
            const jan1 = new Date(year, 0, 1);
            const offset = (jan1.getDay() - start + 7) % 7;
            const days = d3.timeDays(jan1, new Date(year + 1, 0, 1));
            const col = (d: Date) => Math.floor((d3.timeDay.count(jan1, d) + offset) / 7);
            const row = (d: Date) => (d.getDay() - start + 7) % 7;

            yg.append("text").classed("year", true)
                .attr("x", -left + 2).attr("y", monthH + cell * 3.5)
                .attr("font-size", font).attr("dominant-baseline", "middle").text(String(year));
            [0, 2, 4].forEach(r => yg.append("text").classed("weekday", true)
                .attr("x", -4).attr("y", monthH + r * cell + cell / 2)
                .attr("font-size", font * 0.9).attr("text-anchor", "end").attr("dominant-baseline", "middle")
                .text(WEEKDAYS[(r + start) % 7]));
            if (showMonths) {
                d3.timeMonths(jan1, new Date(year + 1, 0, 1)).forEach(m => yg.append("text").classed("month", true)
                    .attr("x", col(m) * cell).attr("y", monthH - font * 0.4)
                    .attr("font-size", font * 0.9).text(`${m.getMonth() + 1}月`));
            }

            yg.append("g").attr("transform", `translate(0,${monthH})`)
                .selectAll("rect").data(days.map(d => byKey.get(dayKey(d)) || null).map((p, i) => ({ p, d: days[i] })))
                .enter().append("rect")
                .attr("x", x => col(x.d) * cell + gap / 2).attr("y", x => row(x.d) * cell + gap / 2)
                .attr("width", cell - gap).attr("height", cell - gap).attr("rx", radius)
                .attr("fill", x => x.p ? color(x.p.value) : emptyColor)
                .classed("day", x => !!x.p);
        });

        this.bindInteractions();
        this.drawLegend(color, lo, hi, width, height, font, cell);
        this.applySelection();
    }

    private bindInteractions() {
        const fmt = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 });
        const tooltip = (event: MouseEvent, p: DayPoint) => ({
            coordinates: [event.clientX, event.clientY],
            isTouchEvent: false,
            dataItems: [
                { displayName: "日期", value: `${p.key} 周${WEEKDAYS[p.date.getDay()]}` },
                { displayName: "数值", value: fmt.format(p.value) }
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
        width: number, height: number, font: number, cell: number) {
        const n = 5, size = Math.max(8, Math.min(cell, 14)), y = height - size - 4;
        const lg = this.svg.append("g").classed("legend", true);
        const x0 = width - 8 - n * (size + 2) - font * 1.6;
        lg.append("text").attr("x", x0 - 4).attr("y", y + size / 2).attr("font-size", font * 0.9)
            .attr("text-anchor", "end").attr("dominant-baseline", "middle").text("少");
        d3.range(n).forEach(i => lg.append("rect")
            .attr("x", x0 + i * (size + 2)).attr("y", y).attr("width", size).attr("height", size).attr("rx", 2)
            .attr("fill", color(lo + (hi - lo) * i / (n - 1))));
        lg.append("text").attr("x", x0 + n * (size + 2) + 2).attr("y", y + size / 2).attr("font-size", font * 0.9)
            .attr("dominant-baseline", "middle").text("多");
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}
