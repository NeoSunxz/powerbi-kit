"use strict";

/*
 * 华夫饼图：10×10 共 100 格，每格 1%，各类别按占比依次填格子。
 * 占比用最大余数法取整，保证加起来正好 100 格。
 * 只用 D3 画 SVG；文字一律 .text() 写入，不用 innerHTML；不联网、不存数据。
 */

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService, formattingSettings } from "powerbi-visuals-utils-formattingmodel";
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

interface Slice {
    name: string;
    value: number;
    share: number;    // 0–1
    cells: number;    // 取整后的格子数
    color: string;
    selectionId: ISelectionId;
}

interface Cell { i: number; s: Slice | null; }

const numberFormat = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 });
const wanFormat = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 1 });
const N = 10;

export class Visual implements IVisual {
    private host: IVisualHost;
    private events: IVisualEventService;
    private selectionManager: ISelectionManager;
    private formattingSettings: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;
    private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    private message: d3.Selection<HTMLDivElement, unknown, null, undefined>;
    private valueName = "数值";

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.events = options.host.eventService;
        this.selectionManager = options.host.createSelectionManager();
        this.formattingSettingsService = new FormattingSettingsService();
        const root = d3.select(options.element);
        this.message = root.append("div").classed("hint", true);
        this.svg = root.append("svg").classed("waffle", true);
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
            const t = this.formattingSettings.textCard;
            t.color.visible = !t.useTheme.value;
            this.formattingSettings.layoutCard.cornerRadius.visible = this.formattingSettings.layoutCard.shape.value.value === "square";
            const slices = this.readData(dv);
            // 每个类别一个取色器，改了存进这个类别的 dataPoint.fill
            this.formattingSettings.colorsCard.slices = (slices || []).map(s => new formattingSettings.ColorPicker({
                name: "fill", displayName: s.name, value: { value: s.color }, selector: s.selectionId.getSelector()
            }));
            this.svg.selectAll("*").remove();
            if (!slices) {
                this.showMessage("「类别」放一个字段（如品类），「数值」放一个度量值（如销售额）。");
            } else if (slices.length === 0) {
                this.showMessage("没有大于 0 的数值。华夫饼图只能画正数的占比。");
            } else {
                this.message.style("display", "none");
                this.render(slices, options.viewport.width, options.viewport.height);
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

    private readData(dv: powerbi.DataView): Slice[] | null {
        const cat = dv && dv.categorical && dv.categorical.categories && dv.categorical.categories[0];
        const vals = dv && dv.categorical && dv.categorical.values && dv.categorical.values[0];
        if (!cat || !vals) return null;
        this.valueName = vals.source.displayName;
        const pal = this.host.colorPalette;
        const objects = cat.objects || [];
        const out: Slice[] = [];
        cat.values.forEach((raw, i) => {
            const v = Number(vals.values[i]);
            if (vals.values[i] === null || isNaN(v) || v <= 0) return;
            const name = raw === null || raw === undefined ? "（空白）" : String(raw);
            out.push({
                name, value: v, share: 0, cells: 0,
                color: pal.isHighContrast ? pal.foreground.value : this.customColor(objects[i]) || pal.getColor(name).value,
                selectionId: this.host.createSelectionIdBuilder().withCategory(cat, i).createSelectionId()
            });
        });
        if (this.formattingSettings.layoutCard.sort.value.value === "value") out.sort((a, b) => b.value - a.value);
        // 最大余数法：先向下取整，剩下的格子给小数部分最大的几个
        const total = d3.sum(out, s => s.value);
        out.forEach(s => { s.share = s.value / total; s.cells = Math.floor(s.share * N * N); });
        const left = N * N - d3.sum(out, s => s.cells);
        out.slice().sort((a, b) => (b.share * N * N - b.cells) - (a.share * N * N - a.cells))
            .slice(0, left).forEach(s => s.cells += 1);
        return out;
    }

    private customColor(o: powerbi.DataViewObjects): string | null {
        const fill = o && o.dataPoint && o.dataPoint.fill as powerbi.Fill;
        return fill && fill.solid && fill.solid.color || null;
    }

    private fmtValue(v: number, max: number): string {
        if (this.formattingSettings.legendCard.unit.value.value === "auto" && max >= 10000) return `${wanFormat.format(v / 10000)}万`;
        return numberFormat.format(v);
    }

    private legendText(s: Slice, max: number): string {
        const l = this.formattingSettings.legendCard;
        const parts = [s.name];
        if (l.showPercent.value) parts.push(`${s.cells}%`);
        if (l.showValue.value) parts.push(this.fmtValue(s.value, max));
        return parts.join("  ");
    }

    private render(slices: Slice[], width: number, height: number) {
        const st = this.formattingSettings;
        const tf = st.textCard.font;
        const font = tf.fontSize.value;
        const pal = this.host.colorPalette as ISandboxExtendedColorPalette;
        const base = pal.background ? pal.background.value : "#FFFFFF";
        const ink = pal.foreground ? pal.foreground.value : "#252423";
        const themeText = pal.foregroundNeutralSecondary || pal.foreground;
        const text = pal.isHighContrast ? pal.foreground.value
            : st.textCard.useTheme.value && themeText ? themeText.value : st.textCard.color.value.value;
        const empty = d3.interpolateLab(base, ink)(0.08);
        const max = d3.max(slices, s => s.value);
        const lg = st.legendCard;

        this.svg.attr("width", width).attr("height", height)
            .style("font-family", tf.fontFamily.value)
            .style("font-weight", tf.bold.value ? "bold" : "normal")
            .style("fill", text);

        // 量图例最宽的一行，决定方阵能占多大
        const probe = this.svg.append("text").attr("font-size", font);
        const legendW = lg.show.value ? d3.max(slices.map(s => { probe.text(this.legendText(s, max)); return probe.node().getComputedTextLength(); })) + font * 1.6 : 0;
        probe.remove();
        const rowH = font * 1.9;
        const right = lg.show.value && lg.position.value.value === "right";
        const bottomLegend = lg.show.value && !right;
        const perRow = bottomLegend ? Math.max(1, Math.floor(width / (legendW + font * 1.5))) : 1;
        const legendBlockH = bottomLegend ? Math.ceil(slices.length / perRow) * rowH + font : 0;
        const size = Math.max(10, Math.min(right ? width - legendW - font * 2 : width, height - legendBlockH) - 2);
        const cell = size / N;
        const gap = cell * Math.max(0, Math.min(45, st.layoutCard.gap.value)) / 100;

        // 从左上角开始一行一行填
        const cells: Cell[] = [];
        let k = 0;
        slices.forEach(s => { for (let j = 0; j < s.cells; j++) cells.push({ i: k++, s }); });
        while (k < N * N) cells.push({ i: k++, s: null });

        const grid = this.svg.append("g").attr("transform", "translate(1,1)");
        const round = st.layoutCard.shape.value.value === "circle";
        const radius = round ? (cell - gap) / 2 : Math.min(st.layoutCard.cornerRadius.value, (cell - gap) / 2);
        grid.selectAll("rect").data(cells).enter().append("rect")
            .attr("x", c => (c.i % N) * cell + gap / 2).attr("y", c => Math.floor(c.i / N) * cell + gap / 2)
            .attr("width", cell - gap).attr("height", cell - gap).attr("rx", radius)
            .attr("fill", c => c.s ? c.s.color : empty)
            .classed("cell", c => !!c.s);

        if (lg.show.value) {
            const legend = this.svg.append("g").classed("legend", true).attr("font-size", font);
            const pos = (i: number) => right
                ? [size + font * 2, Math.max(rowH / 2, size / 2 - slices.length * rowH / 2 + rowH / 2) + i * rowH]
                : [(i % perRow) * (legendW + font * 1.5), size + font + Math.floor(i / perRow) * rowH + rowH / 2];
            const item = legend.selectAll<SVGGElement, Slice>("g.item").data(slices).enter().append("g").classed("item", true)
                .attr("transform", (_, i) => `translate(${pos(i)[0]},${pos(i)[1]})`);
            item.append("rect").attr("y", -font * 0.5).attr("width", font).attr("height", font)
                .attr("rx", round ? font / 2 : Math.min(3, font / 4)).attr("fill", s => s.color);
            item.append("text").attr("x", font * 1.6).attr("dominant-baseline", "middle").text(s => this.legendText(s, max));
        }

        this.bindInteractions();
        this.applySelection();
    }

    private bindInteractions() {
        const tip = (event: MouseEvent, s: Slice) => ({
            coordinates: [event.clientX, event.clientY],
            isTouchEvent: false,
            dataItems: [
                { displayName: "类别", value: s.name },
                { displayName: this.valueName, value: numberFormat.format(s.value) },
                { displayName: "占比", value: `${(s.share * 100).toFixed(1)}%（${s.cells} 格）` }
            ],
            identities: [s.selectionId]
        });
        const on = (sel: d3.Selection<SVGElement, Slice, SVGElement, unknown>) => sel
            .on("mouseover", (event: MouseEvent, s) => this.host.tooltipService.show(tip(event, s)))
            .on("mousemove", (event: MouseEvent, s) => this.host.tooltipService.move(tip(event, s)))
            .on("mouseout", () => this.host.tooltipService.hide({ immediately: true, isTouchEvent: false }))
            .on("click", (event: MouseEvent, s) => {
                event.stopPropagation();
                this.selectionManager.select(s.selectionId, event.ctrlKey || event.metaKey).then(() => this.applySelection());
            })
            .on("contextmenu", (event: MouseEvent, s) => {
                event.stopPropagation();
                event.preventDefault();
                this.selectionManager.showContextMenu(s.selectionId, { x: event.clientX, y: event.clientY });
            });
        // 格子绑的是 Cell，交互用它所属的类别
        const cellSel = this.svg.selectAll<SVGRectElement, Cell>("rect.cell");
        on(cellSel.datum(c => c.s as unknown as Cell) as unknown as d3.Selection<SVGElement, Slice, SVGElement, unknown>);
        on(this.svg.selectAll<SVGGElement, Slice>("g.item") as unknown as d3.Selection<SVGElement, Slice, SVGElement, unknown>);
    }

    private applySelection() {
        if (!this.svg) return;
        const ids = this.selectionManager.getSelectionIds() as ISelectionId[];
        const on = (s: Slice) => !ids.length || ids.some(id => id.equals(s.selectionId));
        this.svg.selectAll<SVGElement, Slice>("rect.cell, g.item").attr("opacity", s => on(s) ? 1 : 0.25);
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}
