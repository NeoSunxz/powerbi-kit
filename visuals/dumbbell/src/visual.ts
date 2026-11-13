"use strict";

/*
 * 哑铃图：每个类别一行，起点和终点两个圆点连一条线。
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
import ISandboxExtendedColorPalette = powerbi.extensibility.ISandboxExtendedColorPalette;

import { VisualFormattingSettingsModel } from "./settings";

interface Row {
    name: string;
    start: number;
    end: number;
    selectionId: ISelectionId;
}

const numberFormat = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 });
const wanFormat = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 1 });

function pct(r: Row): string {
    if (!r.start) return "";
    const p = (r.end - r.start) / Math.abs(r.start) * 100;
    return `${p > 0 ? "+" : ""}${p.toFixed(1)}%`;
}

export class Visual implements IVisual {
    private host: IVisualHost;
    private events: IVisualEventService;
    private selectionManager: ISelectionManager;
    private formattingSettings: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;
    private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    private message: d3.Selection<HTMLDivElement, unknown, null, undefined>;
    private names = { start: "起点", end: "终点" };

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.events = options.host.eventService;
        this.selectionManager = options.host.createSelectionManager();
        this.formattingSettingsService = new FormattingSettingsService();
        const root = d3.select(options.element);
        this.message = root.append("div").classed("hint", true);
        this.svg = root.append("svg").classed("dumbbell", true);
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
            const c = this.formattingSettings.colorsCard, t = this.formattingSettings.textCard;
            [c.startColor, c.upColor, c.downColor].forEach(x => x.visible = !c.useTheme.value);
            t.color.visible = !t.useTheme.value;
            const rows = this.readData(dv);
            this.svg.selectAll("*").remove();
            if (!rows) {
                this.showMessage("「类别」放一个字段（如门店），「起点」「终点」各放一个度量值（如去年、今年的销售额）。");
            } else if (rows.length === 0) {
                this.showMessage("没有数据。");
            } else {
                this.message.style("display", "none");
                this.render(rows, options.viewport.width, options.viewport.height);
            }
            this.events.renderingFinished(options);
        } catch (error) {
            this.events.renderingFailed(options, String(error));
        }
    }

    // 高对比度模式用系统颜色；跟随主题时涨取主题第 1 个数据颜色、跌取第 3 个，起点是卡片底色往文字色挪 35% 的灰
    private resolveColors() {
        const s = this.formattingSettings;
        const pal = this.host.colorPalette as ISandboxExtendedColorPalette;
        if (pal.isHighContrast) {
            const fg = pal.foreground.value, bg = pal.background.value;
            return { start: bg, up: fg, down: fg, line: fg, text: fg, grid: fg, stroke: fg };
        }
        const base = pal.background ? pal.background.value : "#FFFFFF";
        const ink = pal.foreground ? pal.foreground.value : "#252423";
        const themeText = pal.foregroundNeutralSecondary || pal.foreground;
        const text = s.textCard.useTheme.value && themeText ? themeText.value : s.textCard.color.value.value;
        const grid = d3.interpolateLab(base, ink)(0.1);
        let start: string, up: string, down: string;
        if (s.colorsCard.useTheme.value) {
            up = pal.getColor("dumbbell-up").value;
            pal.getColor("dumbbell-2");
            down = pal.getColor("dumbbell-down").value;
            start = d3.interpolateLab(base, ink)(0.35);
        } else {
            start = s.colorsCard.startColor.value.value;
            up = s.colorsCard.upColor.value.value;
            down = s.colorsCard.downColor.value.value;
        }
        return { start, up, down, line: d3.interpolateLab(base, ink)(0.18), text, grid, stroke: null as string };
    }

    private showMessage(text: string) {
        this.svg.attr("width", 0).attr("height", 0);
        this.message.style("display", "block").text(text);
    }

    private readData(dv: powerbi.DataView): Row[] | null {
        const cat = dv && dv.categorical && dv.categorical.categories && dv.categorical.categories[0];
        const values = dv && dv.categorical && dv.categorical.values;
        if (!cat || !values) return null;
        const start = values.filter(v => v.source.roles && v.source.roles.start)[0];
        const end = values.filter(v => v.source.roles && v.source.roles.end)[0];
        if (!start || !end) return null;
        this.names = { start: start.source.displayName, end: end.source.displayName };
        const out: Row[] = [];
        cat.values.forEach((raw, i) => {
            const a = start.values[i], b = end.values[i];
            if (a === null || a === undefined || b === null || b === undefined || isNaN(Number(a)) || isNaN(Number(b))) return;
            out.push({
                name: raw === null || raw === undefined ? "（空白）" : String(raw),
                start: Number(a), end: Number(b),
                selectionId: this.host.createSelectionIdBuilder().withCategory(cat, i).createSelectionId()
            });
        });
        const sort = String(this.formattingSettings.layoutCard.sort.value.value);
        if (sort === "end") out.sort((x, y) => y.end - x.end);
        if (sort === "change") out.sort((x, y) => (y.end - y.start) / Math.abs(y.start || 1) - (x.end - x.start) / Math.abs(x.start || 1));
        return out;
    }

    private fmt(v: number, max: number): string {
        const unit = String(this.formattingSettings.labelsCard.unit.value.value);
        if (unit === "auto" && Math.abs(max) >= 10000) return `${wanFormat.format(v / 10000)}万`;
        return numberFormat.format(v);
    }

    private render(rows: Row[], width: number, height: number) {
        const s = this.formattingSettings;
        const tf = s.textCard.font;
        const font = tf.fontSize.value;
        const colors = this.resolveColors();
        const lb = s.labelsCard;
        const r = Math.max(2, s.layoutCard.dotSize.value);
        const all = rows.reduce((a, x) => a.concat([x.start, x.end]), [] as number[]);
        const lo = d3.min(all), hi = d3.max(all);
        const maxAbs = d3.max(all.map(Math.abs));

        this.svg.attr("width", width).attr("height", height)
            .style("font-family", tf.fontFamily.value)
            .style("font-weight", tf.bold.value ? "bold" : "normal")
            .style("fill", colors.text);

        // 左边放类别名，量最长的一个；右边留出数值和变化的位置
        const probe = this.svg.append("text").attr("font-size", font);
        const nameW = d3.max(rows.map(x => { probe.text(x.name); return probe.node().getComputedTextLength(); }));
        const valueW = lb.showValues.value ? d3.max(all.map(v => { probe.text(this.fmt(v, maxAbs)); return probe.node().getComputedTextLength(); })) : 0;
        probe.text("+00.0%");
        const changeW = lb.showChange.value ? probe.node().getComputedTextLength() : 0;
        probe.remove();

        const legendH = lb.showLegend.value ? font * 2.2 : 0;
        const axisH = font * 1.8;
        const left = nameW + font * 1.2 + (valueW ? valueW + r + 6 : 0);
        const right = (valueW ? valueW + r + 6 : 0) + (changeW ? changeW + font : 0) + 8;
        const top = legendH + 4, bottom = axisH;
        const band = (height - top - bottom) / rows.length;

        let d0 = s.layoutCard.zeroBased.value ? Math.min(0, lo) : lo, d1 = hi;
        if (!s.layoutCard.zeroBased.value) { const pad = (hi - lo || Math.abs(hi) || 1) * 0.08; d0 = lo - pad; d1 = hi + pad; }
        const x = d3.scaleLinear().domain([d0, d1]).nice(5).range([left, Math.max(left + 10, width - right)]);

        // 网格和坐标轴（下方）
        const ticks = x.ticks(5);
        const grid = this.svg.append("g").classed("grid", true);
        grid.selectAll("line").data(ticks).enter().append("line")
            .attr("x1", d => x(d)).attr("x2", d => x(d)).attr("y1", top).attr("y2", height - bottom)
            .attr("stroke", colors.grid).attr("stroke-width", 1);
        grid.selectAll("text").data(ticks).enter().append("text")
            .attr("x", d => x(d)).attr("y", height - bottom + font * 1.3).attr("text-anchor", "middle")
            .attr("font-size", font * 0.9).text(d => this.fmt(d, maxAbs));

        const g = this.svg.append("g");
        const row = g.selectAll<SVGGElement, Row>("g.row").data(rows).enter().append("g").classed("row", true)
            .attr("transform", (_, i) => `translate(0,${top + band * i + band / 2})`);
        // 整行透明底：鼠标在这一行任何地方都算悬停这一行
        row.append("rect").classed("hit", true).attr("x", 0).attr("y", -band / 2).attr("width", width).attr("height", band)
            .attr("fill", "transparent");
        row.append("text").classed("name", true).attr("x", nameW).attr("text-anchor", "end").attr("dominant-baseline", "middle")
            .attr("font-size", font).text(d => d.name);
        row.append("line").attr("x1", d => x(d.start)).attr("x2", d => x(d.end))
            .attr("stroke", colors.line).attr("stroke-width", s.layoutCard.lineWidth.value).attr("stroke-linecap", "round");
        row.append("circle").attr("cx", d => x(d.start)).attr("r", r).attr("fill", colors.start);
        row.append("circle").attr("cx", d => x(d.end)).attr("r", r).attr("fill", d => d.end >= d.start ? colors.up : colors.down);
        if (valueW) {
            const lowSide = (d: Row) => Math.min(x(d.start), x(d.end)), highSide = (d: Row) => Math.max(x(d.start), x(d.end));
            row.append("text").attr("x", d => lowSide(d) - r - 6).attr("text-anchor", "end").attr("dominant-baseline", "middle")
                .attr("font-size", font * 0.9).text(d => this.fmt(d.end >= d.start ? d.start : d.end, maxAbs));
            row.append("text").attr("x", d => highSide(d) + r + 6).attr("dominant-baseline", "middle")
                .attr("font-size", font * 0.9).text(d => this.fmt(d.end >= d.start ? d.end : d.start, maxAbs));
        }
        if (changeW) {
            row.append("text").classed("change", true).attr("x", width - 4).attr("text-anchor", "end").attr("dominant-baseline", "middle")
                .attr("font-size", font).attr("font-weight", "bold")
                .attr("fill", d => d.end >= d.start ? colors.up : colors.down).text(d => pct(d));
        }

        if (lb.showLegend.value) this.drawLegend(colors, font, left);
        this.bindInteractions(maxAbs);
        this.applySelection();
    }

    private drawLegend(colors: { start: string; up: string }, font: number, left: number) {
        const g = this.svg.append("g").classed("legend", true).attr("font-size", font).attr("transform", `translate(${left},${font})`);
        let x = 0;
        [[this.names.start, colors.start], [this.names.end, colors.up]].forEach(([name, color]) => {
            g.append("circle").attr("cx", x + font * 0.45).attr("r", font * 0.45).attr("fill", color);
            const t = g.append("text").attr("x", x + font * 1.2).attr("dominant-baseline", "middle").text(name);
            x += font * 1.2 + t.node().getComputedTextLength() + font * 1.4;
        });
    }

    private bindInteractions(maxAbs: number) {
        const tooltip = (event: MouseEvent, d: Row) => ({
            coordinates: [event.clientX, event.clientY],
            isTouchEvent: false,
            dataItems: [
                { displayName: "类别", value: d.name },
                { displayName: this.names.start, value: numberFormat.format(d.start) },
                { displayName: this.names.end, value: numberFormat.format(d.end) },
                { displayName: "变化", value: `${d.end - d.start >= 0 ? "+" : ""}${this.fmt(d.end - d.start, maxAbs)}（${pct(d) || "—"}）` }
            ],
            identities: [d.selectionId]
        });
        this.svg.selectAll<SVGGElement, Row>("g.row")
            .on("mouseover", (event: MouseEvent, d) => this.host.tooltipService.show(tooltip(event, d)))
            .on("mousemove", (event: MouseEvent, d) => this.host.tooltipService.move(tooltip(event, d)))
            .on("mouseout", () => this.host.tooltipService.hide({ immediately: true, isTouchEvent: false }))
            .on("click", (event: MouseEvent, d) => {
                event.stopPropagation();
                this.selectionManager.select(d.selectionId, event.ctrlKey || event.metaKey).then(() => this.applySelection());
            })
            .on("contextmenu", (event: MouseEvent, d) => {
                event.stopPropagation();
                event.preventDefault();
                this.selectionManager.showContextMenu(d.selectionId, { x: event.clientX, y: event.clientY });
            });
    }

    private applySelection() {
        if (!this.svg) return;
        const ids = this.selectionManager.getSelectionIds() as ISelectionId[];
        this.svg.selectAll<SVGGElement, Row>("g.row")
            .attr("opacity", d => !ids.length || ids.some(id => id.equals(d.selectionId)) ? 1 : 0.25);
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}
