"use strict";

/*
 * 排名变化图（凹凸图）：横轴是时间，纵轴是名次（第 1 名在最上面），每个类别一条线。
 * 每个时间点按数值从高到低排名，组件自己算名次，度量值不用写 RANKX。
 * 默认只给名次变过的线上色，从头到尾没变的留灰，换位的那几条一眼就能看出来。
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

interface Point { t: number; value: number; rank: number }
interface Series {
    name: string;
    points: Array<Point | null>;   // 按时间顺序，没数据的时间点是 null
    changed: boolean;
    color: string;
    colored: boolean;
    selectionId: ISelectionId;
}
interface Data { times: string[]; series: Series[]; maxRank: number }
interface Colors { muted: string; text: string; ink: string; grid: string; surface: string }

const numberFormat = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 });
const collator = new Intl.Collator("zh-CN", { numeric: true });

export class Visual implements IVisual {
    private host: IVisualHost;
    private events: IVisualEventService;
    private selectionManager: ISelectionManager;
    private formattingSettings: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;
    private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    private message: d3.Selection<HTMLDivElement, unknown, null, undefined>;
    private names = { series: "类别", time: "时间", value: "数值" };
    private xs: number[] = [];

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
            c.mutedColor.visible = !c.useTheme.value;
            t.color.visible = !t.useTheme.value;
            const colors = this.resolveColors();
            const data = this.readData(dv, colors);
            this.svg.selectAll("*").remove();
            if (!data) {
                this.showMessage("「类别」放一个字段（如产品），「时间」放一个字段（如月份），「数值」放一个度量值（如销售额）。");
            } else if (data.series.length < 2 || data.times.length < 2) {
                this.showMessage("至少要 2 个类别、2 个时间点才能看出名次变化。");
            } else {
                this.message.style("display", "none");
                this.render(data, colors, options.viewport.width, options.viewport.height);
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
            return { muted: fg, text: fg, ink: fg, grid: fg, surface: bg };
        }
        const base = pal.background ? pal.background.value : "#FFFFFF";
        const ink = pal.foreground ? pal.foreground.value : "#252423";
        const themeText = pal.foregroundNeutralSecondary || pal.foreground;
        const text = s.textCard.useTheme.value && themeText ? themeText.value : s.textCard.color.value.value;
        const muted = s.colorsCard.useTheme.value ? d3.interpolateLab(base, ink)(0.2) : s.colorsCard.mutedColor.value.value;
        return { muted, text, ink, grid: d3.interpolateLab(base, ink)(0.07), surface: base };
    }

    private showMessage(text: string) {
        this.svg.attr("width", 0).attr("height", 0);
        this.message.style("display", "block").text(text);
    }

    private readData(dv: powerbi.DataView, colors: Colors): Data | null {
        const cat = dv && dv.categorical && dv.categorical.categories && dv.categorical.categories[0];
        const values = dv && dv.categorical && dv.categorical.values;
        if (!cat || !values || !values.source || !values.length) return null;
        const groups = values.grouped();
        if (!groups.length) return null;
        this.names = { series: values.source.displayName, time: cat.source.displayName, value: values[0].source.displayName };

        // 时间顺序：数字、日期按大小，文字按「1 月、2 月……10 月」这样的自然顺序
        const raw = cat.values.map(v => v);
        let order = raw.map((_, i) => i);
        if (this.formattingSettings.layoutCard.order.value.value === "auto") {
            const numeric = raw.every(v => v instanceof Date || typeof v === "number");
            order = order.sort((a, b) => numeric ? Number(raw[a]) - Number(raw[b]) : collator.compare(label(raw[a]), label(raw[b])));
        }
        const times = order.map(i => label(raw[i]));

        const series: Series[] = groups.map(g => {
            const col = g.values.filter(v => v.source.roles && v.source.roles.value)[0] || g.values[0];
            const points = order.map((i, t) => {
                const v = col.values[i];
                return v === null || v === undefined || isNaN(Number(v)) ? null : { t, value: Number(v), rank: 0 };
            });
            return {
                name: g.name === null || g.name === undefined ? "（空白）" : label(g.name), points, changed: false, color: colors.muted, colored: false,
                selectionId: this.host.createSelectionIdBuilder().withSeries(values, g).createSelectionId()
            };
        });
        // 每个时间点按数值从高到低排名，数值一样按名字
        times.forEach((_, t) => {
            const here = series.filter(s => s.points[t]).sort((a, b) => b.points[t].value - a.points[t].value || collator.compare(a.name, b.name));
            here.forEach((s, k) => s.points[t].rank = k + 1);
        });
        const maxRank = d3.max(series, s => d3.max(s.points, p => p ? p.rank : 0)) || 1;
        const all = this.formattingSettings.layoutCard.emphasis.value.value === "all";
        const pal = this.host.colorPalette;
        // 按最后一期的名次依次取主题颜色，同样的数据每次颜色都一样
        const lastRank = (s: Series) => { const p = s.points.filter(x => x).pop(); return p ? p.rank : 999; };
        series.slice().sort((a, b) => lastRank(a) - lastRank(b)).forEach(s => {
            const ranks = s.points.filter(p => p).map(p => p.rank);
            s.changed = ranks.length !== times.length || new Set(ranks).size > 1;
            s.colored = all || s.changed;
            if (s.colored) s.color = pal.getColor(s.name).value;
        });
        return { times, series, maxRank };
    }

    private render(data: Data, colors: Colors, width: number, height: number) {
        const s = this.formattingSettings;
        const tf = s.textCard.font;
        const font = tf.fontSize.value;
        const lb = s.labelsCard, lay = s.layoutCard;
        const lw = Math.max(1, Math.min(12, lay.lineWidth.value));
        const inDot = lb.showRankInDot.value;

        this.svg.attr("width", width).attr("height", height)
            .style("font-family", tf.fontFamily.value)
            .style("font-weight", tf.bold.value ? "bold" : "normal")
            .style("fill", colors.text);

        const probe = this.svg.append("text").attr("font-size", font);
        const measure = (t: string) => { probe.text(t); return probe.node().getComputedTextLength(); };
        const nameW = d3.max(data.series, x => measure(x.name));
        const rankW = measure(String(data.maxRank));
        probe.remove();

        const left = lb.showStart.value ? nameW + rankW + font * 2 : font * 1.5;
        const right = lb.showEnd.value ? nameW + rankW + font * 2 : font * 1.5;
        const top = font * 1.2, bottom = font * 2.6;
        const xs = data.times.map((_, i) => left + (width - left - right) * (data.times.length === 1 ? 0.5 : i / (data.times.length - 1)));
        this.xs = xs;
        const y = d3.scalePoint<number>().domain(d3.range(1, data.maxRank + 1)).range([top, height - bottom]).padding(0.5);
        const r = inDot ? Math.max(font * 0.85, lw * 1.6) : Math.max(lw * 1.4, font * 0.36);

        // 每个时间点一道竖的细线，下面写时间
        const grid = this.svg.append("g");
        xs.forEach((x, i) => {
            grid.append("line").attr("x1", x).attr("x2", x).attr("y1", top).attr("y2", height - bottom + font * 0.4)
                .attr("stroke", colors.grid).attr("stroke-width", 1);
            grid.append("text").attr("x", x).attr("y", height - bottom + font * 1.7).attr("text-anchor", "middle")
                .attr("font-size", font * 0.9).text(data.times[i]);
        });

        const line = d3.line<Point>().defined(p => !!p).x(p => xs[p.t]).y(p => y(p.rank))
            .curve(lay.curve.value ? d3.curveBumpX : d3.curveLinear);
        // 灰的先画，上色的压在上面
        const ordered = data.series.slice().sort((a, b) => Number(a.colored) - Number(b.colored));
        const g = this.svg.append("g").selectAll<SVGGElement, Series>("g.item").data(ordered).enter().append("g").classed("item", true);
        g.append("path").attr("d", d => line(d.points)).attr("fill", "none").attr("stroke", "transparent").attr("stroke-width", Math.max(14, lw * 4));
        g.append("path").classed("line", true).attr("d", d => line(d.points)).attr("fill", "none")
            .attr("stroke", d => d.color).attr("stroke-width", lw).attr("stroke-linecap", "round").attr("stroke-linejoin", "round");
        g.each((d, i, nodes) => {
            const gg = d3.select(nodes[i]);
            d.points.forEach(p => {
                if (!p) return;
                gg.append("circle").attr("cx", xs[p.t]).attr("cy", y(p.rank)).attr("r", r)
                    .attr("fill", d.color).attr("stroke", colors.surface).attr("stroke-width", 2);
                if (inDot) {
                    gg.append("text").attr("x", xs[p.t]).attr("y", y(p.rank)).attr("text-anchor", "middle").attr("dominant-baseline", "central")
                        .attr("font-size", font * 0.85).style("font-weight", "bold").style("fill", colors.surface).text(p.rank);
                }
            });
            const first = d.points.filter(p => p)[0], last = d.points.filter(p => p).pop();
            const ink = d.colored ? colors.ink : colors.text;
            if (lb.showStart.value && first) {
                gg.append("text").attr("x", xs[first.t] - r - font * 0.6).attr("y", y(first.rank)).attr("text-anchor", "end")
                    .attr("dominant-baseline", "central").attr("font-size", font).style("fill", ink).text(`${d.name}  ${first.rank}`);
            }
            if (lb.showEnd.value && last) {
                gg.append("text").attr("x", xs[last.t] + r + font * 0.6).attr("y", y(last.rank))
                    .attr("dominant-baseline", "central").attr("font-size", font).style("fill", ink).text(`${last.rank}  ${d.name}`);
            }
        });

        this.bindInteractions(data);
        this.applySelection();
    }

    private nearest(event: MouseEvent, d: Series): Point | null {
        const [mx] = d3.pointer(event, this.svg.node());
        let best: Point | null = null, gap = Infinity;
        d.points.forEach(p => { if (p && Math.abs(this.xs[p.t] - mx) < gap) { gap = Math.abs(this.xs[p.t] - mx); best = p; } });
        return best;
    }

    private bindInteractions(data: Data) {
        const tip = (event: MouseEvent, d: Series) => {
            const p = this.nearest(event, d);
            const items = [{ displayName: this.names.series, value: d.name }];
            if (p) {
                const prev = p.t > 0 ? d.points[p.t - 1] : null;
                items.push({ displayName: this.names.time, value: data.times[p.t] },
                    { displayName: "名次", value: `第 ${p.rank} 名` },
                    { displayName: this.names.value, value: numberFormat.format(p.value) });
                if (prev) items.push({ displayName: "比上一期", value: prev.rank === p.rank ? "名次没变" : prev.rank > p.rank ? `升 ${prev.rank - p.rank} 名` : `降 ${p.rank - prev.rank} 名` });
            }
            return { coordinates: [event.clientX, event.clientY], isTouchEvent: false, dataItems: items, identities: [d.selectionId] };
        };
        this.svg.selectAll<SVGGElement, Series>("g.item")
            .on("mouseover", (event: MouseEvent, d) => { this.focus(d); this.host.tooltipService.show(tip(event, d)); })
            .on("mousemove", (event: MouseEvent, d) => this.host.tooltipService.move(tip(event, d)))
            .on("mouseout", () => { this.applySelection(); this.host.tooltipService.hide({ immediately: true, isTouchEvent: false }); })
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

    // 鼠标放到一条线上：这条线留着，其他的变淡
    private focus(d: Series) {
        this.svg.selectAll<SVGGElement, Series>("g.item").attr("opacity", x => x === d ? 1 : 0.15);
        this.svg.selectAll<SVGGElement, Series>("g.item").filter(x => x === d).raise();
    }

    private applySelection() {
        if (!this.svg) return;
        const ids = this.selectionManager.getSelectionIds() as ISelectionId[];
        this.svg.selectAll<SVGGElement, Series>("g.item")
            .attr("opacity", d => !ids.length || ids.some(id => id.equals(d.selectionId)) ? 1 : 0.15);
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}

function label(v: powerbi.PrimitiveValue): string {
    if (v instanceof Date) return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}`;
    return v === null || v === undefined ? "（空白）" : String(v);
}
