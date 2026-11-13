"use strict";

/*
 * 南丁格尔玫瑰图：每个类别一片花瓣，角度都一样，长短表示数值。
 * 花瓣长短三种算法：半径按数值（从 0 开始）、面积按数值（半径开根号，最不夸张）、突出差异（最小值到最大值铺满，差异会被放大）。
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

interface Petal {
    name: string;
    value: number;
    custom: string | null;
    color: string;
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
    private valueName = "数值";

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.events = options.host.eventService;
        this.selectionManager = options.host.createSelectionManager();
        this.formattingSettingsService = new FormattingSettingsService();
        const root = d3.select(options.element);
        this.message = root.append("div").classed("hint", true);
        this.svg = root.append("svg").classed("rose", true);
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
            const petals = this.readData(dv);
            const custom = this.formattingSettings.colorsCard.mode.value.value === "custom";
            this.formattingSettings.dataPointCard.visible = custom;
            this.formattingSettings.dataPointCard.slices = custom ? (petals || []).map(p => new formattingSettings.ColorPicker({
                name: "fill", displayName: p.name, value: { value: p.color }, selector: p.selectionId.getSelector()
            })) : [];
            this.svg.selectAll("*").remove();
            if (!petals) {
                this.showMessage("「类别」放一个字段（如产品、月份），「数值」放一个度量值（如销售额）。");
            } else if (petals.length === 0) {
                this.showMessage("没有大于 0 的数值。");
            } else {
                this.message.style("display", "none");
                this.render(petals, options.viewport.width, options.viewport.height);
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

    private readData(dv: powerbi.DataView): Petal[] | null {
        const cat = dv && dv.categorical && dv.categorical.categories && dv.categorical.categories[0];
        const vals = dv && dv.categorical && dv.categorical.values && dv.categorical.values[0];
        if (!cat || !vals) return null;
        this.valueName = vals.source.displayName;
        const objects = cat.objects || [];
        const out: Petal[] = [];
        cat.values.forEach((raw, i) => {
            const v = Number(vals.values[i]);
            if (vals.values[i] === null || isNaN(v) || v <= 0) return;
            const o = objects[i];
            const fill = o && o.dataPoint && o.dataPoint.fill as powerbi.Fill;
            out.push({
                name: raw === null || raw === undefined ? "（空白）" : String(raw), value: v,
                custom: fill && fill.solid && fill.solid.color || null, color: "",
                selectionId: this.host.createSelectionIdBuilder().withCategory(cat, i).createSelectionId()
            });
        });
        if (this.formattingSettings.layoutCard.sort.value.value === "desc") out.sort((a, b) => b.value - a.value);
        this.assignColors(out);
        return out;
    }

    // 渐变：按排好的顺序从主题第一个颜色（深）走到它的浅色；按类别：主题颜色轮换；自己选：用户改过的颜色，没改的按类别
    private assignColors(petals: Petal[]) {
        const pal = this.host.colorPalette as ISandboxExtendedColorPalette;
        if (pal.isHighContrast) { petals.forEach(p => p.color = pal.foreground.value); return; }
        const mode = String(this.formattingSettings.colorsCard.mode.value.value);
        if (mode === "gradient") {
            const base = pal.background ? pal.background.value : "#FFFFFF";
            const c0 = pal.getColor("rose-gradient").value;
            const ramp = d3.interpolateLab(c0, d3.interpolateLab(base, c0)(0.28));
            petals.forEach((p, i) => p.color = ramp(petals.length > 1 ? i / (petals.length - 1) : 0));
            return;
        }
        petals.forEach(p => p.color = (mode === "custom" && p.custom) || pal.getColor(p.name).value);
    }

    private fmt(v: number, max: number): string {
        if (this.formattingSettings.labelsCard.unit.value.value === "auto" && max >= 10000) return `${wanFormat.format(v / 10000)}万`;
        return numberFormat.format(v);
    }

    private render(petals: Petal[], width: number, height: number) {
        const s = this.formattingSettings;
        const tf = s.textCard.font;
        const font = tf.fontSize.value;
        const pal = this.host.colorPalette as ISandboxExtendedColorPalette;
        const themeText = pal.foregroundNeutralSecondary || pal.foreground;
        const text = pal.isHighContrast ? pal.foreground.value
            : s.textCard.useTheme.value && themeText ? themeText.value : s.textCard.color.value.value;
        const ink = pal.foreground ? pal.foreground.value : "#252423";
        const lb = s.labelsCard;
        const max = d3.max(petals, p => p.value), min = d3.min(petals, p => p.value);

        this.svg.attr("width", width).attr("height", height)
            .style("font-family", tf.fontFamily.value)
            .style("font-weight", tf.bold.value ? "bold" : "normal")
            .style("fill", text);

        // 标签在花瓣外面，量最长的一个，四周留出这么宽
        const label = (p: Petal) => lb.showValue.value ? `${p.name} ${this.fmt(p.value, max)}` : p.name;
        let labelW = 0;
        if (lb.show.value) {
            const probe = this.svg.append("text").attr("font-size", font);
            labelW = d3.max(petals.map(p => { probe.text(label(p)); return probe.node().getComputedTextLength(); }));
            probe.remove();
        }
        const outer = Math.max(10, Math.min(width / 2 - (labelW ? labelW + font : 4), height / 2 - (labelW ? font * 2 : 4)));
        const inner = outer * Math.max(0, Math.min(80, s.layoutCard.innerRadius.value)) / 100;
        const mode = String(s.layoutCard.radiusMode.value.value);
        const span = outer - inner;
        const r = (v: number) => {
            if (mode === "area") return Math.sqrt(inner * inner + (outer * outer - inner * inner) * v / max);
            if (mode === "range") return inner + span * (0.18 + 0.82 * (max === min ? 1 : (v - min) / (max - min)));
            return inner + span * v / max;
        };

        const step = Math.PI * 2 / petals.length;
        const pad = Math.max(0, s.layoutCard.padAngle.value) * Math.PI / 180;
        const g = this.svg.append("g").attr("transform", `translate(${width / 2},${height / 2})`);
        const arc = d3.arc<Petal>()
            .innerRadius(inner).outerRadius(p => r(p.value))
            .startAngle((_, i) => i * step + pad / 2).endAngle((_, i) => (i + 1) * step - pad / 2)
            .cornerRadius(Math.max(0, s.layoutCard.cornerRadius.value));
        g.selectAll<SVGPathElement, Petal>("path.petal").data(petals).enter().append("path").classed("petal", true)
            .attr("d", (p, i) => arc(p, i)).attr("fill", p => p.color);

        if (lb.show.value) {
            g.selectAll("text.label").data(petals).enter().append("text").classed("label", true)
                .each(function (p: Petal, i: number) {
                    const a = (i + 0.5) * step;           // 从 12 点钟方向顺时针
                    // 文字往哪边伸，就看那一侧的邻居：邻居花瓣更长时往外推，免得压在它上面
                    const n = petals.length, prev = petals[(i + n - 1) % n], next = petals[(i + 1) % n];
                    const x0 = Math.sin(a), deg = a * 180 / Math.PI;
                    const side = Math.abs(x0) * r(p.value) < font ? [prev, next]
                        : x0 > 0 ? [deg < 90 ? next : prev] : [deg < 270 ? next : prev];
                    const rr = Math.max(r(p.value), d3.max(side, q => r(q.value)) * 0.92) + font * 0.6;
                    const x = Math.sin(a) * rr, y = -Math.cos(a) * rr;
                    d3.select(this).attr("x", x).attr("y", y).attr("font-size", font).attr("dominant-baseline", "middle")
                        .attr("text-anchor", Math.abs(x) < font ? "middle" : x > 0 ? "start" : "end")
                        .text(label(p));
                });
        }

        if (s.centerCard.show.value && inner > font * 2.4) {
            const total = d3.sum(petals, p => p.value);
            g.append("text").attr("text-anchor", "middle").attr("y", -font * 0.15).attr("font-size", Math.min(inner * 0.42, font * 2))
                .attr("font-weight", "bold").style("fill", ink).text(this.fmt(total, total));
            g.append("text").attr("text-anchor", "middle").attr("y", font * 1.3).attr("font-size", font * 0.9)
                .text(s.centerCard.title.value || this.valueName);
        }

        this.bindInteractions(max);
        this.applySelection();
    }

    private bindInteractions(max: number) {
        const total = d3.sum(this.svg.selectAll<SVGPathElement, Petal>("path.petal").data(), p => p.value);
        const tip = (event: MouseEvent, p: Petal) => ({
            coordinates: [event.clientX, event.clientY],
            isTouchEvent: false,
            dataItems: [
                { displayName: "类别", value: p.name },
                { displayName: this.valueName, value: numberFormat.format(p.value) },
                { displayName: "占合计", value: `${(p.value / total * 100).toFixed(1)}%` },
                { displayName: "是最大值的", value: `${(p.value / max * 100).toFixed(0)}%` }
            ],
            identities: [p.selectionId]
        });
        this.svg.selectAll<SVGPathElement, Petal>("path.petal")
            .on("mouseover", (event: MouseEvent, p) => this.host.tooltipService.show(tip(event, p)))
            .on("mousemove", (event: MouseEvent, p) => this.host.tooltipService.move(tip(event, p)))
            .on("mouseout", () => this.host.tooltipService.hide({ immediately: true, isTouchEvent: false }))
            .on("click", (event: MouseEvent, p) => {
                event.stopPropagation();
                this.selectionManager.select(p.selectionId, event.ctrlKey || event.metaKey).then(() => this.applySelection());
            })
            .on("contextmenu", (event: MouseEvent, p) => {
                event.stopPropagation();
                event.preventDefault();
                this.selectionManager.showContextMenu(p.selectionId, { x: event.clientX, y: event.clientY });
            });
    }

    private applySelection() {
        if (!this.svg) return;
        const ids = this.selectionManager.getSelectionIds() as ISelectionId[];
        const on = (p: Petal) => !ids.length || ids.some(id => id.equals(p.selectionId));
        this.svg.selectAll<SVGPathElement, Petal>("path.petal").attr("opacity", p => on(p) ? 1 : 0.25);
        this.svg.selectAll<SVGTextElement, Petal>("text.label").attr("opacity", p => on(p) ? 1 : 0.35);
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}
