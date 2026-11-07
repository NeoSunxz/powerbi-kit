"use strict";

/*
 * 图片卡片墙：每个类别一张卡片，上面是图片，下面是名称、主数值、副数值和占比条，按主数值排名。
 * 图片只认 data:image/...;base64,（或不带前缀的纯 base64，按 JPEG/PNG 自动补前缀），不加载网址，所以不联网。
 * 只用 DOM API 建元素，文字一律 textContent 写入，不用 innerHTML；不存数据。
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
    image: string | null;
    subtitle: string;
    value: number | null;
    value2: number | null;
    rank: number;
    selectionId: ISelectionId;
}

interface Names { value: string; value2: string; value2Percent: boolean; }

const numberFormat = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 });
const wanFormat = new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 1 });

// 只放行图片的 data URI；纯 base64 按开头几个字符认 JPEG / PNG / GIF / WebP
function toImageSrc(raw: powerbi.PrimitiveValue): string | null {
    if (typeof raw !== "string") return null;
    const s = raw.trim();
    if (/^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,[A-Za-z0-9+/=\s]+$/i.test(s)) return s;
    if (/^[A-Za-z0-9+/=\s]{100,}$/.test(s)) {
        const kind = s.startsWith("/9j/") ? "jpeg" : s.startsWith("iVBOR") ? "png" : s.startsWith("R0lGOD") ? "gif" : s.startsWith("UklGR") ? "webp" : null;
        return kind ? `data:image/${kind};base64,${s}` : null;
    }
    return null;
}

export class Visual implements IVisual {
    private host: IVisualHost;
    private events: IVisualEventService;
    private selectionManager: ISelectionManager;
    private formattingSettings: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;
    private root: HTMLElement;
    private grid: HTMLDivElement;
    private message: HTMLDivElement;
    private items: Item[] = [];

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.events = options.host.eventService;
        this.selectionManager = options.host.createSelectionManager();
        this.formattingSettingsService = new FormattingSettingsService();
        this.root = options.element;
        this.message = document.createElement("div");
        this.message.className = "hint";
        this.grid = document.createElement("div");
        this.grid.className = "ic-cards";
        this.root.append(this.message, this.grid);
        this.grid.addEventListener("click", () => this.selectionManager.clear().then(() => this.applySelection()));
        this.grid.addEventListener("contextmenu", (event: MouseEvent) => {
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
            c.accent.visible = c.cardColor.visible = !c.useTheme.value;
            t.color.visible = !t.useTheme.value;
            this.formattingSettings.labelsCard.topN.visible = this.formattingSettings.labelsCard.showRank.value;
            this.formattingSettings.layoutCard.minWidth.visible = this.formattingSettings.layoutCard.columns.value <= 0;
            const read = this.readData(dv);
            this.grid.replaceChildren();
            if (!read) {
                this.showMessage("「类别」放一个字段（如产品），「图片」放存 base64 图片的列，「主数值」放一个度量值（如销售额）。\n「小字说明」「副数值」可以不放。");
            } else if (read.items.length === 0) {
                this.showMessage("没有数据。");
            } else {
                this.message.style.display = "none";
                this.grid.style.display = "grid";
                this.items = read.items;
                this.render(read.items, read.names, options.viewport.width, options.viewport.height);
            }
            this.events.renderingFinished(options);
        } catch (error) {
            this.events.renderingFailed(options, String(error));
        }
    }

    private showMessage(text: string) {
        this.grid.style.display = "none";
        this.message.style.display = "block";
        this.message.textContent = text;
    }

    private readData(dv: powerbi.DataView): { items: Item[]; names: Names } | null {
        const table = dv && dv.table;
        if (!table || !table.columns) return null;
        const col = (role: string) => table.columns.findIndex(c => c.roles && c.roles[role]);
        const ci = col("category"), ii = col("image"), si = col("subtitle"), vi = col("value"), v2 = col("value2");
        if (ci < 0 || vi < 0) return null;
        const num = (row: powerbi.DataViewTableRow, i: number) => {
            if (i < 0 || row[i] === null || row[i] === undefined || isNaN(Number(row[i]))) return null;
            return Number(row[i]);
        };
        const fmt2 = v2 >= 0 ? table.columns[v2].format || "" : "";
        const names: Names = {
            value: table.columns[vi].displayName,
            value2: v2 >= 0 ? table.columns[v2].displayName : "",
            value2Percent: fmt2.indexOf("%") >= 0
        };
        const items: Item[] = table.rows.map((row, i) => ({
            name: row[ci] === null || row[ci] === undefined ? "（空白）" : String(row[ci]),
            image: ii >= 0 ? toImageSrc(row[ii]) : null,
            subtitle: si >= 0 && row[si] !== null && row[si] !== undefined ? String(row[si]) : "",
            value: num(row, vi), value2: num(row, v2), rank: 0,
            selectionId: this.host.createSelectionIdBuilder().withTable(table, i).createSelectionId()
        }));
        const ranked = items.filter(x => x.value !== null).sort((a, b) => b.value - a.value);
        ranked.forEach((x, k) => x.rank = k + 1);
        if (this.formattingSettings.layoutCard.sort.value.value === "desc") {
            items.sort((a, b) => (a.rank || 1e9) - (b.rank || 1e9));
        }
        return { items, names };
    }

    private fmt(v: number, max: number): string {
        if (this.formattingSettings.labelsCard.unit.value.value === "auto" && Math.abs(max) >= 10000) return `${wanFormat.format(v / 10000)}万`;
        return numberFormat.format(v);
    }

    private fmt2(v: number, names: Names): string {
        if (names.value2Percent) return `${v > 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;
        return numberFormat.format(v);
    }

    private resolveColors() {
        const s = this.formattingSettings;
        const pal = this.host.colorPalette as ISandboxExtendedColorPalette;
        if (pal.isHighContrast) {
            const fg = pal.foreground.value, bg = pal.background.value;
            return { accent: fg, card: bg, ink: fg, muted: fg, track: bg, onAccent: bg, badge: bg };
        }
        const base = pal.background ? pal.background.value : "#FFFFFF";
        const ink0 = pal.foreground ? pal.foreground.value : "#252423";
        const second = pal.foregroundNeutralSecondary ? pal.foregroundNeutralSecondary.value : "#605E5C";
        const accent = s.colorsCard.useTheme.value ? pal.getColor("imageCards-accent").value : s.colorsCard.accent.value.value;
        const card = s.colorsCard.useTheme.value ? base : s.colorsCard.cardColor.value.value;
        const ink = s.textCard.useTheme.value ? ink0 : s.textCard.color.value.value;
        const muted = s.textCard.useTheme.value ? second : d3.interpolateLab(card, ink)(0.6);
        const onAccent = d3.hsl(accent).l > 0.6 ? "#252423" : "#FFFFFF";
        return { accent, card, ink, muted, track: d3.interpolateLab(card, ink)(0.1), onAccent, badge: d3.interpolateLab(card, ink)(0.75) };
    }

    private render(items: Item[], names: Names, width: number, height: number) {
        const s = this.formattingSettings;
        const L = s.layoutCard, lb = s.labelsCard;
        const tf = s.textCard.font;
        const font = tf.fontSize.value;
        const col = this.resolveColors();
        const gap = Math.max(0, L.gap.value);
        const cols = L.columns.value > 0 ? Math.round(L.columns.value)
            : Math.max(1, Math.floor((width - gap + gap) / (Math.max(60, L.minWidth.value) + gap)));
        const ratio = Number(L.imageRatio.value.value) || 1;
        const max = d3.max(items, x => x.value === null ? 0 : Math.abs(x.value)) || 0;
        const top = d3.max(items, x => x.value) || 0;

        const g = this.grid;
        g.style.width = `${width}px`;
        g.style.height = `${height}px`;
        g.style.gap = `${gap}px`;
        g.style.padding = `${Math.min(gap, 6)}px`;
        g.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
        g.style.alignContent = "start";
        g.style.fontFamily = tf.fontFamily.value;
        g.style.fontSize = `${font}px`;
        g.style.color = col.ink;

        const el = (tag: string, cls: string, parent: HTMLElement, text?: string) => {
            const e = document.createElement(tag);
            e.className = cls;
            if (text !== undefined) e.textContent = text;
            parent.appendChild(e);
            return e;
        };
        items.forEach(item => {
            const card = el("div", "ic-card", g);
            card.style.background = col.card;
            card.style.borderRadius = `${Math.max(0, L.radius.value)}px`;
            card.style.boxShadow = "0 1px 2px rgba(0,0,0,.06), 0 4px 14px rgba(0,0,0,.05)";

            const pic = el("div", "ic-pic", card);
            pic.style.paddingTop = `${ratio * 100}%`;
            pic.style.background = col.track;
            if (item.image) {
                const img = document.createElement("img");
                img.src = item.image;
                img.alt = item.name;
                img.style.objectFit = String(L.imageFit.value.value);
                pic.appendChild(img);
            } else {
                const n = el("div", "ic-noimg", pic, "无图片");
                n.style.color = col.muted;
            }
            if (lb.showRank.value && item.rank) {
                const hot = item.rank <= Math.max(0, lb.topN.value);
                const b = el("span", "ic-rank", pic, `${item.rank}`);
                b.style.background = hot ? col.accent : col.badge;
                b.style.color = hot ? col.onAccent : col.card;
                b.style.fontSize = `${font * 0.95}px`;
            }

            const body = el("div", "ic-body", card);
            const pad = Math.max(6, font * 0.8);
            body.style.padding = `${pad * 0.8}px ${pad}px ${pad}px`;
            const name = el("div", "ic-name", body, item.name);
            name.style.fontSize = `${font * 1.15}px`;
            if (tf.bold.value) name.style.fontWeight = "bold";
            if (item.subtitle) { const sub = el("div", "ic-sub", body, item.subtitle); sub.style.color = col.muted; sub.style.fontSize = `${font * 0.9}px`; }
            const row = el("div", "ic-row", body);
            if (item.value !== null) {
                const v = el("span", "ic-val", row, this.fmt(item.value, max));
                v.style.fontSize = `${font * 1.45}px`;
                v.style.color = col.accent;
            }
            if (item.value2 !== null) {
                const v2 = el("div", "ic-v2", body, `${names.value2} ${this.fmt2(item.value2, names)}`);
                v2.style.color = col.muted;
                v2.style.fontSize = `${font * 0.9}px`;
            }
            if (lb.showBar.value && item.value !== null && top > 0) {
                const bar = el("div", "ic-bar", body);
                bar.style.background = col.track;
                bar.style.marginTop = `${font * 0.4}px`;
                const fill = el("i", "", bar);
                fill.style.width = `${Math.max(0, Math.min(100, item.value / top * 100))}%`;
                fill.style.background = col.accent;
            }

            d3.select(card).datum(item);
            card.addEventListener("click", (event: MouseEvent) => {
                event.stopPropagation();
                this.selectionManager.select(item.selectionId, event.ctrlKey || event.metaKey).then(() => this.applySelection());
            });
            card.addEventListener("contextmenu", (event: MouseEvent) => {
                event.stopPropagation();
                event.preventDefault();
                this.selectionManager.showContextMenu(item.selectionId, { x: event.clientX, y: event.clientY });
            });
            const tip = (event: MouseEvent) => ({
                coordinates: [event.clientX, event.clientY],
                isTouchEvent: false,
                dataItems: [
                    { displayName: "类别", value: item.name },
                    ...(item.value !== null ? [{ displayName: names.value, value: numberFormat.format(item.value) }] : []),
                    ...(item.rank ? [{ displayName: "排名", value: `第 ${item.rank} / ${items.filter(x => x.rank).length}` }] : []),
                    ...(item.value2 !== null ? [{ displayName: names.value2, value: this.fmt2(item.value2, names) }] : [])
                ],
                identities: [item.selectionId]
            });
            card.addEventListener("mouseover", (event: MouseEvent) => this.host.tooltipService.show(tip(event)));
            card.addEventListener("mousemove", (event: MouseEvent) => this.host.tooltipService.move(tip(event)));
            card.addEventListener("mouseout", () => this.host.tooltipService.hide({ immediately: true, isTouchEvent: false }));
        });
        this.applySelection();
    }

    private applySelection() {
        const ids = this.selectionManager.getSelectionIds() as ISelectionId[];
        d3.select(this.grid).selectAll<HTMLDivElement, Item>("div.ic-card")
            .style("opacity", x => !ids.length || ids.some(id => id.equals(x.selectionId)) ? "1" : "0.3");
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}
