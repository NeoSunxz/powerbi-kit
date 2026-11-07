"use strict";

/*
 * 帕累托图：类别按数值从高到低排成柱子，一条折线是累计占比，一道虚线是分界（默认 80%）。
 * 柱子和折线共用一把 0–100% 的尺（柱高 = 这一类占总数的比例），不画第二个纵轴。
 * 累计到分界线为止的柱子用主题色，过线以后的变浅；柱子太多时，排在后面的合并成「其他」。
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

interface Item {
    name: string;
    value: number;
    share: number;      // 占总数的比例
    cum: number;        // 累计到这一类的比例
    rank: number;       // 从 1 开始
    count: number;      // 合并的「其他」里有几类，普通类别是 1
    inside: boolean;    // 累计到分界线为止（含过线的那一根）
    selectionId: ISelectionId | null;
}

interface Colors { bar: string; rest: string; line: string; text: string; grid: string; surface: string }

const numberFormat = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 });
const wanFormat = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 1 });
const pct = (v: number) => `${(v * 100).toFixed(0)}%`;
const pct1 = (v: number) => `${(v * 100).toFixed(1)}%`;

export class Visual implements IVisual {
    private host: IVisualHost;
    private events: IVisualEventService;
    private selectionManager: ISelectionManager;
    private formattingSettings: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;
    private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    private message: d3.Selection<HTMLDivElement, unknown, null, undefined>;
    private names = { category: "类别", value: "数值" };

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.events = options.host.eventService;
        this.selectionManager = options.host.createSelectionManager();
        this.formattingSettingsService = new FormattingSettingsService();
        const root = d3.select(options.element);
        this.message = root.append("div").classed("hint", true);
        this.svg = root.append("svg").classed("chart", true);
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
            [c.barColor, c.lineColor].forEach(x => x.visible = !c.useTheme.value);
            t.color.visible = !t.useTheme.value;
            const items = this.readData(dv);
            this.svg.selectAll("*").remove();
            if (!items) {
                this.showMessage("「类别」放一个字段（如产品），「数值」放一个度量值（如销售额）。");
            } else if (items.length === 0) {
                this.showMessage("没有大于 0 的数据。");
            } else {
                this.message.style("display", "none");
                this.render(items, options.viewport.width, options.viewport.height);
            }
            this.events.renderingFinished(options);
        } catch (error) {
            this.events.renderingFailed(options, String(error));
        }
    }

    private resolveColors(): Colors {
        const s = this.formattingSettings;
        const pal = this.host.colorPalette as ISandboxExtendedColorPalette;
        if (pal.isHighContrast) {
            const fg = pal.foreground.value, bg = pal.background.value;
            return { bar: fg, rest: bg, line: fg, text: fg, grid: fg, surface: bg };
        }
        const base = pal.background ? pal.background.value : "#FFFFFF";
        const ink = pal.foreground ? pal.foreground.value : "#252423";
        const themeText = pal.foregroundNeutralSecondary || pal.foreground;
        const text = s.textCard.useTheme.value && themeText ? themeText.value : s.textCard.color.value.value;
        const grid = d3.interpolateLab(base, ink)(0.1);
        const bar = s.colorsCard.useTheme.value ? pal.getColor("pareto-bar").value : s.colorsCard.barColor.value.value;
        const line = s.colorsCard.useTheme.value ? ink : s.colorsCard.lineColor.value.value;
        // 过线以后的柱子：同一个颜色往卡片底色走，深色主题下也看得见
        const rest = d3.interpolateLab(base, bar)(0.38);
        return { bar, rest, line, text, grid, surface: base };
    }

    private showMessage(text: string) {
        this.svg.attr("width", 0).attr("height", 0);
        this.message.style("display", "block").text(text);
    }

    private readData(dv: powerbi.DataView): Item[] | null {
        const cat = dv && dv.categorical && dv.categorical.categories && dv.categorical.categories[0];
        const values = dv && dv.categorical && dv.categorical.values;
        if (!cat || !values) return null;
        const val = values.filter(v => v.source.roles && v.source.roles.value)[0];
        if (!val) return null;
        this.names = { category: cat.source.displayName, value: val.source.displayName };
        const rows: Array<{ name: string; value: number; selectionId: ISelectionId }> = [];
        cat.values.forEach((raw, i) => {
            const v = Number(val.values[i]);
            if (val.values[i] === null || isNaN(v) || v <= 0) return;
            rows.push({
                name: raw === null || raw === undefined ? "（空白）" : String(raw), value: v,
                selectionId: this.host.createSelectionIdBuilder().withCategory(cat, i).createSelectionId()
            });
        });
        rows.sort((a, b) => b.value - a.value);
        const lay = this.formattingSettings.layoutCard;
        const max = Math.max(2, Math.round(lay.maxBars.value || 0));
        const total = d3.sum(rows, r => r.value);
        const kept = rows.length > max ? rows.slice(0, max - 1) : rows;
        const out: Item[] = kept.map((r, i) => ({ ...r, share: r.value / total, cum: 0, rank: i + 1, count: 1, inside: false }));
        if (rows.length > max) {
            const rest = rows.slice(max - 1), v = d3.sum(rest, r => r.value);
            out.push({ name: lay.otherName.value || "其他", value: v, share: v / total, cum: 0, rank: max, count: rest.length, inside: false, selectionId: null });
        }
        const thr = this.threshold();
        let run = 0, crossed = false;
        out.forEach(it => {
            run += it.value;
            it.cum = run / total;
            it.inside = !crossed;
            if (it.cum >= thr - 1e-9) crossed = true;
        });
        return out;
    }

    private threshold(): number {
        return Math.min(100, Math.max(1, this.formattingSettings.thresholdCard.value.value)) / 100;
    }

    private fmt(v: number, max: number): string {
        if (this.formattingSettings.labelsCard.unit.value.value === "auto" && Math.abs(max) >= 10000) return `${wanFormat.format(v / 10000)}万`;
        return numberFormat.format(v);
    }

    private render(items: Item[], width: number, height: number) {
        const s = this.formattingSettings;
        const tf = s.textCard.font;
        const font = tf.fontSize.value;
        const colors = this.resolveColors();
        const lb = s.labelsCard;
        const thr = this.threshold();
        const showThr = s.thresholdCard.show.value;
        const dim = s.layoutCard.dimRest.value;
        const maxV = d3.max(items, d => d.value);
        const cross = items.filter(d => d.inside).pop();

        this.svg.attr("width", width).attr("height", height)
            .style("font-family", tf.fontFamily.value)
            .style("font-weight", tf.bold.value ? "bold" : "normal")
            .style("fill", colors.text);

        const probe = this.svg.append("text").attr("font-size", font * 0.9);
        const measure = (t: string) => { probe.text(t); return probe.node().getComputedTextLength(); };
        const axisW = measure("100%");
        const nameW = d3.max(items, d => measure(d.name));
        const thrW = measure(pct(thr));
        probe.remove();

        const headH = font * 2.4;
        const left = axisW + font * 0.8, right = showThr ? thrW + font * 1.2 : font;
        const plotW = Math.max(20, width - left - right);
        const x = d3.scaleBand<number>().domain(items.map((_, i) => i)).range([left, left + plotW]).paddingInner(0.28).paddingOuter(0.14);
        const rotate = nameW > x.step() * 0.95;
        const bottom = rotate ? Math.min(height * 0.4, nameW * 0.72 + font) : font * 2;
        const top = headH + font * 0.6;
        const y = d3.scaleLinear().domain([0, 1]).range([height - bottom, top]);

        // 纵轴：一把 0–100% 的尺，柱子和折线共用
        const axis = this.svg.append("g").classed("axis", true).attr("font-size", font * 0.9);
        [0, 0.2, 0.4, 0.6, 0.8, 1].forEach(t => {
            axis.append("line").attr("x1", left).attr("x2", left + plotW).attr("y1", y(t)).attr("y2", y(t))
                .attr("stroke", colors.grid).attr("stroke-width", 1);
            axis.append("text").attr("x", left - font * 0.5).attr("y", y(t)).attr("text-anchor", "end")
                .attr("dominant-baseline", "middle").text(pct(t));
        });

        // 横轴文字
        const names = this.svg.append("g").attr("font-size", font * 0.9);
        items.forEach((d, i) => {
            const cx = x(i) + x.bandwidth() / 2, ty = height - bottom + font * 1.2;
            const t = names.append("text").text(d.name);
            if (rotate) t.attr("transform", `translate(${cx},${ty - font * 0.4}) rotate(-40)`).attr("text-anchor", "end");
            else t.attr("x", cx).attr("y", ty).attr("text-anchor", "middle");
        });

        // 分界线
        if (showThr) {
            this.svg.append("line").attr("x1", left).attr("x2", left + plotW).attr("y1", y(thr)).attr("y2", y(thr))
                .attr("stroke", colors.line).attr("stroke-width", 1.2).attr("stroke-dasharray", "5,4").attr("opacity", 0.7);
            this.svg.append("text").attr("x", left + plotW + font * 0.5).attr("y", y(thr)).attr("dominant-baseline", "middle")
                .attr("font-size", font * 0.9).text(pct(thr));
        }

        // 柱子
        const g = this.svg.append("g").selectAll<SVGGElement, Item>("g.item").data(items).enter().append("g").classed("item", true);
        g.append("rect").attr("x", (_, i) => x(i) - x.step() * x.paddingInner() / 2).attr("y", top)
            .attr("width", x.step()).attr("height", height - bottom - top).attr("fill", "transparent");
        const barColor = (d: Item) => !dim || (d.inside && d.selectionId) ? colors.bar : colors.rest;
        g.append("path").classed("bar", true)
            .attr("d", (d, i) => roundTop(x(i), y(d.share), x.bandwidth(), y(0) - y(d.share), Math.min(4, x.bandwidth() / 4)))
            .attr("fill", barColor);
        if (lb.showValue.value) {
            g.append("text").attr("font-size", font * 0.85).attr("text-anchor", "middle")
                .attr("x", (_, i) => x(i) + x.bandwidth() / 2)
                .each((d, i, nodes) => {
                    const h = y(0) - y(d.share), t = d3.select(nodes[i]).text(this.fmt(d.value, maxV));
                    const w = t.node().getComputedTextLength();
                    // 柱子够高够宽就把数写在柱子里，免得和折线的点挤在一起
                    if (h > font * 2.2 && w < x.bandwidth() - 4) {
                        t.attr("y", y(d.share) + font * 1.25).style("fill", barColor(d) === colors.bar ? colors.surface : colors.text);
                    } else {
                        t.attr("y", y(d.share) - font * 0.45);
                    }
                });
        }

        // 累计占比折线
        const pts = items.map((d, i) => [x(i) + x.bandwidth() / 2, y(d.cum)] as [number, number]);
        this.svg.append("path").attr("d", d3.line()(pts)).attr("fill", "none").attr("stroke", colors.line)
            .attr("stroke-width", 2).attr("stroke-linejoin", "round").style("pointer-events", "none");
        const dots = this.svg.append("g").style("pointer-events", "none");
        items.forEach((d, i) => {
            const on = d === cross;
            dots.append("circle").attr("cx", pts[i][0]).attr("cy", pts[i][1]).attr("r", on ? font * 0.42 : font * 0.3)
                .attr("fill", colors.line).attr("stroke", colors.surface).attr("stroke-width", 2);
            const mode = lb.showCumulative.value.value;
            if (mode === "all" || (mode === "cross" && on)) {
                // 太靠上会压到图例，就写到点的下面
                const below = pts[i][1] - font * 1.6 < top;
                dots.append("text").attr("x", pts[i][0]).attr("y", below ? pts[i][1] + font * 1.5 : pts[i][1] - font * 0.9).attr("text-anchor", on && i > 0 ? "end" : "middle")
                    .attr("dx", on && i > 0 ? -font * 0.3 : 0).attr("font-size", font * (on ? 1 : 0.85))
                    .style("font-weight", on ? "bold" : null).style("fill", on ? colors.line : colors.text).text(pct(d.cum));
            }
        });

        // 左上角一句话 + 图例
        const head = this.svg.append("g").attr("transform", `translate(${left},${font * 1.3})`);
        // 过线的是合并出来的「其他」时，说前面单独画出来的几个
        const said = cross && !cross.selectionId ? items.filter(d => d.selectionId).pop() : cross;
        if (lb.showCallout.value && said) {
            head.append("text").attr("font-size", font * 1.2).style("font-weight", "bold").style("fill", colors.line)
                .text(`前 ${said.rank} 个占 ${pct(said.cum)}`);
        }
        this.drawLegend(colors, font, left + plotW);
        this.bindInteractions(maxV);
        this.applySelection();
    }

    private drawLegend(colors: Colors, font: number, rightEdge: number) {
        const g = this.svg.append("g").classed("legend", true).attr("font-size", font * 0.9);
        const items: Array<[string, string]> = [["bar", `${this.names.value}占比`], ["line", "累计占比"]];
        let x = 0;
        const parts: Array<() => void> = [];
        items.forEach(([kind, name]) => {
            const x0 = x;
            const t = g.append("text").attr("x", x0 + font * 1.6).attr("y", font * 1.3).attr("dominant-baseline", "middle").text(name);
            parts.push(() => {
                if (kind === "bar") g.append("rect").attr("x", x0).attr("y", font * 0.85).attr("width", font * 1.1).attr("height", font * 0.9).attr("rx", 2).attr("fill", colors.bar);
                else {
                    g.append("line").attr("x1", x0).attr("x2", x0 + font * 1.2).attr("y1", font * 1.3).attr("y2", font * 1.3).attr("stroke", colors.line).attr("stroke-width", 2);
                    g.append("circle").attr("cx", x0 + font * 0.6).attr("cy", font * 1.3).attr("r", font * 0.28).attr("fill", colors.line);
                }
            });
            x += font * 1.6 + t.node().getComputedTextLength() + font * 1.2;
        });
        parts.forEach(f => f());
        g.attr("transform", `translate(${rightEdge - x + font * 1.2},0)`);
    }

    private bindInteractions(maxV: number) {
        const tip = (event: MouseEvent, d: Item) => ({
            coordinates: [event.clientX, event.clientY],
            isTouchEvent: false,
            dataItems: [
                { displayName: this.names.category, value: d.count > 1 ? `${d.name}（${d.count} 个）` : d.name },
                { displayName: this.names.value, value: numberFormat.format(d.value) },
                { displayName: "占比", value: pct1(d.share) },
                { displayName: "累计占比", value: pct1(d.cum) },
                { displayName: "排名", value: d.count > 1 ? `${d.rank} 名以后` : `第 ${d.rank} 名` }
            ],
            identities: d.selectionId ? [d.selectionId] : []
        });
        this.svg.selectAll<SVGGElement, Item>("g.item")
            .on("mouseover", (event: MouseEvent, d) => this.host.tooltipService.show(tip(event, d)))
            .on("mousemove", (event: MouseEvent, d) => this.host.tooltipService.move(tip(event, d)))
            .on("mouseout", () => this.host.tooltipService.hide({ immediately: true, isTouchEvent: false }))
            .on("click", (event: MouseEvent, d) => {
                event.stopPropagation();
                if (!d.selectionId) return;
                this.selectionManager.select(d.selectionId, event.ctrlKey || event.metaKey).then(() => this.applySelection());
            })
            .on("contextmenu", (event: MouseEvent, d) => {
                event.stopPropagation();
                event.preventDefault();
                this.selectionManager.showContextMenu(d.selectionId || {}, { x: event.clientX, y: event.clientY });
            });
    }

    private applySelection() {
        if (!this.svg) return;
        const ids = this.selectionManager.getSelectionIds() as ISelectionId[];
        this.svg.selectAll<SVGGElement, Item>("g.item")
            .attr("opacity", d => !ids.length || (d.selectionId && ids.some(id => id.equals(d.selectionId))) ? 1 : 0.3);
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}

// 上面两个角是圆的、底边贴着基线的柱子
function roundTop(x: number, y: number, w: number, h: number, r: number): string {
    if (h <= 0) return "";
    const rr = Math.min(r, h, w / 2);
    return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}
