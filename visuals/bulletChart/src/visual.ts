"use strict";

/*
 * 子弹图：每个类别一行。背后三段色带是差 / 中 / 好的区间（按目标的百分比），
 * 中间一根细条是实际值，一道竖线是目标。默认按完成率画，所有目标线对齐在同一个位置。
 * 只用 D3 画 SVG；文字一律 .text() 写入，不用 innerHTML；不联网、不存数据。
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
    actual: number;
    target: number;
    rate: number;     // 实际 / 目标
    selectionId: ISelectionId;
}

const numberFormat = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 });
const wanFormat = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 1 });

export class Visual implements IVisual {
    private host: IVisualHost;
    private events: IVisualEventService;
    private selectionManager: ISelectionManager;
    private formattingSettings: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;
    private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    private message: d3.Selection<HTMLDivElement, unknown, null, undefined>;
    private names = { actual: "实际", target: "目标" };

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.events = options.host.eventService;
        this.selectionManager = options.host.createSelectionManager();
        this.formattingSettingsService = new FormattingSettingsService();
        const root = d3.select(options.element);
        this.message = root.append("div").classed("hint", true);
        this.svg = root.append("svg").classed("bullet", true);
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
            [c.barColor, c.missColor, c.targetColor, c.bandColor].forEach(x => x.visible = !c.useTheme.value);
            t.color.visible = !t.useTheme.value;
            const rows = this.readData(dv);
            this.svg.selectAll("*").remove();
            if (!rows) {
                this.showMessage("「类别」放一个字段（如门店），「实际」「目标」各放一个度量值（如销售额、目标销售额）。");
            } else if (rows.length === 0) {
                this.showMessage("没有目标大于 0 的数据。");
            } else {
                this.message.style("display", "none");
                this.render(rows, options.viewport.width, options.viewport.height);
            }
            this.events.renderingFinished(options);
        } catch (error) {
            this.events.renderingFailed(options, String(error));
        }
    }

    private resolveColors() {
        const s = this.formattingSettings;
        const pal = this.host.colorPalette as ISandboxExtendedColorPalette;
        if (pal.isHighContrast) {
            const fg = pal.foreground.value, bg = pal.background.value;
            return { bar: fg, miss: fg, target: fg, bands: [bg, bg, bg], text: fg, grid: fg };
        }
        const base = pal.background ? pal.background.value : "#FFFFFF";
        const ink = pal.foreground ? pal.foreground.value : "#252423";
        const themeText = pal.foregroundNeutralSecondary || pal.foreground;
        const text = s.textCard.useTheme.value && themeText ? themeText.value : s.textCard.color.value.value;
        const grid = d3.interpolateLab(base, ink)(0.1);
        if (s.colorsCard.useTheme.value) {
            const bar = pal.getColor("bullet-actual").value;
            pal.getColor("bullet-2");
            const miss = pal.getColor("bullet-miss").value;
            // 差最深，好最浅
            const bands = [0.2, 0.12, 0.06].map(k => d3.interpolateLab(base, ink)(k));
            return { bar, miss, target: ink, bands, text, grid };
        }
        const deep = s.colorsCard.bandColor.value.value;
        const bands = [1, 0.6, 0.3].map(k => d3.interpolateLab(base, deep)(k));
        return { bar: s.colorsCard.barColor.value.value, miss: s.colorsCard.missColor.value.value,
            target: s.colorsCard.targetColor.value.value, bands, text, grid };
    }

    private showMessage(text: string) {
        this.svg.attr("width", 0).attr("height", 0);
        this.message.style("display", "block").text(text);
    }

    private readData(dv: powerbi.DataView): Row[] | null {
        const cat = dv && dv.categorical && dv.categorical.categories && dv.categorical.categories[0];
        const values = dv && dv.categorical && dv.categorical.values;
        if (!cat || !values) return null;
        const actual = values.filter(v => v.source.roles && v.source.roles.actual)[0];
        const target = values.filter(v => v.source.roles && v.source.roles.target)[0];
        if (!actual || !target) return null;
        this.names = { actual: actual.source.displayName, target: target.source.displayName };
        const out: Row[] = [];
        cat.values.forEach((raw, i) => {
            const a = Number(actual.values[i]), t = Number(target.values[i]);
            if (actual.values[i] === null || target.values[i] === null || isNaN(a) || isNaN(t) || t <= 0) return;
            out.push({
                name: raw === null || raw === undefined ? "（空白）" : String(raw), actual: a, target: t, rate: a / t,
                selectionId: this.host.createSelectionIdBuilder().withCategory(cat, i).createSelectionId()
            });
        });
        if (this.formattingSettings.layoutCard.sort.value.value === "rate") out.sort((x, y) => y.rate - x.rate);
        return out;
    }

    private fmt(v: number, max: number): string {
        if (this.formattingSettings.labelsCard.unit.value.value === "auto" && Math.abs(max) >= 10000) return `${wanFormat.format(v / 10000)}万`;
        return numberFormat.format(v);
    }

    private render(rows: Row[], width: number, height: number) {
        const s = this.formattingSettings;
        const tf = s.textCard.font;
        const font = tf.fontSize.value;
        const colors = this.resolveColors();
        const lb = s.labelsCard;
        const byRate = s.layoutCard.scale.value.value === "rate";
        const b = s.bandsCard;
        const poor = Math.max(0, b.poor.value) / 100, good = Math.max(poor, b.good.value / 100), top100 = Math.max(good, b.max.value / 100, 1);
        const maxV = d3.max(rows, r => Math.max(r.actual, r.target));

        this.svg.attr("width", width).attr("height", height)
            .style("font-family", tf.fontFamily.value)
            .style("font-weight", tf.bold.value ? "bold" : "normal")
            .style("fill", colors.text);

        const label = (r: Row) => [lb.showValue.value ? this.fmt(r.actual, maxV) : "", lb.showRate.value ? `${(r.rate * 100).toFixed(1)}%` : ""]
            .filter(x => x).join("  ");
        const probe = this.svg.append("text").attr("font-size", font);
        const nameW = d3.max(rows.map(r => { probe.text(r.name); return probe.node().getComputedTextLength(); }));
        const labelW = d3.max(rows.map(r => { probe.text(label(r)); return probe.node().getComputedTextLength(); })) || 0;
        probe.remove();

        const legendH = lb.showLegend.value ? font * 2.2 : 0;
        const axisH = font * 1.8;
        const left = nameW + font * 1.2, right = labelW ? labelW + font : 8;
        const top = legendH + 4, bottom = axisH;
        const band = (height - top - bottom) / rows.length;
        const h = Math.min(band * 0.62, font * 3.2);
        const barH = h * Math.max(10, Math.min(100, s.layoutCard.barHeight.value)) / 100;

        // 按完成率：每行的刻度都以目标为 100%；按数值：所有行同一把尺
        const domainMax = byRate ? Math.max(top100, d3.max(rows, r => r.rate)) : d3.max(rows, r => Math.max(r.actual, r.target * top100));
        const x = d3.scaleLinear().domain([0, domainMax]).range([left, Math.max(left + 10, width - right)]);
        const pos = (r: Row, v: number) => byRate ? x(v / r.target) : x(v);

        const ticks = x.ticks(byRate ? 6 : 5);
        const axis = this.svg.append("g").classed("axis", true);
        axis.selectAll("text").data(ticks).enter().append("text")
            .attr("x", d => x(d)).attr("y", height - bottom + font * 1.3).attr("text-anchor", "middle")
            .attr("font-size", font * 0.9).text(d => byRate ? `${Math.round(d * 100)}%` : this.fmt(d, maxV));

        const row = this.svg.append("g").selectAll<SVGGElement, Row>("g.row").data(rows).enter().append("g").classed("row", true)
            .attr("transform", (_, i) => `translate(0,${top + band * i + band / 2})`);
        row.append("rect").attr("x", 0).attr("y", -band / 2).attr("width", width).attr("height", band).attr("fill", "transparent");
        row.append("text").attr("x", nameW).attr("text-anchor", "end").attr("dominant-baseline", "middle").attr("font-size", font).text(r => r.name);
        // 三段色带
        const segs = (r: Row) => [[0, poor], [poor, good], [good, top100]].map(([a, z], k) => ({ a: r.target * a, z: r.target * z, k }));
        row.each((r, i, nodes) => {
            const g = d3.select(nodes[i]);
            segs(r).forEach(sg => g.append("rect").attr("x", pos(r, sg.a)).attr("y", -h / 2)
                .attr("width", Math.max(0, pos(r, sg.z) - pos(r, sg.a))).attr("height", h).attr("fill", colors.bands[sg.k]));
        });
        const miss = s.layoutCard.missHighlight.value;
        row.append("rect").classed("actual", true).attr("x", x(0)).attr("y", -barH / 2)
            .attr("width", r => Math.max(0, pos(r, r.actual) - x(0))).attr("height", barH).attr("rx", Math.min(2, barH / 4))
            .attr("fill", r => miss && r.actual < r.target ? colors.miss : colors.bar);
        row.append("rect").classed("target", true).attr("x", r => pos(r, r.target) - 1.5).attr("y", -h * 0.42)
            .attr("width", 3).attr("height", h * 0.84).attr("fill", colors.target);
        if (labelW) {
            row.append("text").attr("x", width - right + font * 0.6).attr("dominant-baseline", "middle").attr("font-size", font)
                .text(r => label(r));
        }

        if (lb.showLegend.value) this.drawLegend(colors, font, left, miss);
        this.bindInteractions(maxV);
        this.applySelection();
    }

    private drawLegend(colors: { bar: string; miss: string; target: string; bands: string[] }, font: number, left: number, miss: boolean) {
        const g = this.svg.append("g").classed("legend", true).attr("font-size", font).attr("transform", `translate(${left},${font})`);
        let x = 0;
        const items: Array<[string, string, string]> = [["bar", colors.bar, this.names.actual]];
        if (miss) items.push(["bar", colors.miss, "没达标"]);
        items.push(["tick", colors.target, this.names.target]);
        items.forEach(([kind, color, name]) => {
            if (kind === "bar") g.append("rect").attr("x", x).attr("y", -font * 0.25).attr("width", font * 1.2).attr("height", font * 0.5).attr("fill", color);
            else g.append("rect").attr("x", x + font * 0.5).attr("y", -font * 0.55).attr("width", 3).attr("height", font * 1.1).attr("fill", color);
            const t = g.append("text").attr("x", x + font * 1.6).attr("dominant-baseline", "middle").text(name);
            x += font * 1.6 + t.node().getComputedTextLength() + font * 1.4;
        });
    }

    private bindInteractions(maxV: number) {
        const tip = (event: MouseEvent, r: Row) => ({
            coordinates: [event.clientX, event.clientY],
            isTouchEvent: false,
            dataItems: [
                { displayName: "类别", value: r.name },
                { displayName: this.names.actual, value: numberFormat.format(r.actual) },
                { displayName: this.names.target, value: numberFormat.format(r.target) },
                { displayName: "完成率", value: `${(r.rate * 100).toFixed(1)}%` },
                { displayName: r.actual >= r.target ? "超出" : "还差", value: this.fmt(Math.abs(r.actual - r.target), maxV) }
            ],
            identities: [r.selectionId]
        });
        this.svg.selectAll<SVGGElement, Row>("g.row")
            .on("mouseover", (event: MouseEvent, r) => this.host.tooltipService.show(tip(event, r)))
            .on("mousemove", (event: MouseEvent, r) => this.host.tooltipService.move(tip(event, r)))
            .on("mouseout", () => this.host.tooltipService.hide({ immediately: true, isTouchEvent: false }))
            .on("click", (event: MouseEvent, r) => {
                event.stopPropagation();
                this.selectionManager.select(r.selectionId, event.ctrlKey || event.metaKey).then(() => this.applySelection());
            })
            .on("contextmenu", (event: MouseEvent, r) => {
                event.stopPropagation();
                event.preventDefault();
                this.selectionManager.showContextMenu(r.selectionId, { x: event.clientX, y: event.clientY });
            });
    }

    private applySelection() {
        if (!this.svg) return;
        const ids = this.selectionManager.getSelectionIds() as ISelectionId[];
        this.svg.selectAll<SVGGElement, Row>("g.row")
            .attr("opacity", r => !ids.length || ids.some(id => id.equals(r.selectionId)) ? 1 : 0.25);
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}
