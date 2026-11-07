"use strict";

import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

// 颜色默认跟随报表主题：实际值取主题第一个数据颜色，没达标取第三个，目标线用主题文字色，色带是卡片底色往文字色走的几级灰。
// 关掉「跟随报表主题」才显示取色器；默认值取自燕麦拿铁主题。
class ColorsCard extends FormattingSettingsCard {
    useTheme = new formattingSettings.ToggleSwitch({ name: "useTheme", displayName: "跟随报表主题", value: true });
    barColor = new formattingSettings.ColorPicker({ name: "barColor", displayName: "实际值", value: { value: "#2A669F" } });
    missColor = new formattingSettings.ColorPicker({ name: "missColor", displayName: "实际值（没达标）", value: { value: "#A95960" } });
    targetColor = new formattingSettings.ColorPicker({ name: "targetColor", displayName: "目标线", value: { value: "#2D2A26" } });
    bandColor = new formattingSettings.ColorPicker({ name: "bandColor", displayName: "色带（最深一级）", value: { value: "#D9D2C7" } });

    name: string = "colors";
    displayName: string = "颜色";
    slices: Array<FormattingSettingsSlice> = [this.useTheme, this.barColor, this.missColor, this.targetColor, this.bandColor];
}

// 色带按目标的百分比分三段：0–「差」、「差」–「好」、「好」–「最大」
class BandsCard extends FormattingSettingsCard {
    poor = new formattingSettings.NumUpDown({ name: "poor", displayName: "「差」到目标的（%）", value: 80 });
    good = new formattingSettings.NumUpDown({ name: "good", displayName: "「好」从目标的（%）", value: 100 });
    max = new formattingSettings.NumUpDown({ name: "max", displayName: "色带画到目标的（%）", value: 120 });

    name: string = "bands";
    displayName: string = "色带";
    slices: Array<FormattingSettingsSlice> = [this.poor, this.good, this.max];
}

export const SCALE_ITEMS = [
    { value: "rate", displayName: "按完成率（目标对齐）" },
    { value: "value", displayName: "按数值（统一刻度）" }
];
export const SORT_ITEMS = [
    { value: "rate", displayName: "按完成率，从高到低" },
    { value: "none", displayName: "按字段原顺序" }
];
export const UNIT_ITEMS = [
    { value: "auto", displayName: "自动（满 1 万显示「万」）" },
    { value: "none", displayName: "原值" }
];

class LayoutCard extends FormattingSettingsCard {
    scale = new formattingSettings.ItemDropdown({ name: "scale", displayName: "刻度", items: SCALE_ITEMS, value: SCALE_ITEMS[0] });
    sort = new formattingSettings.ItemDropdown({ name: "sort", displayName: "排序", items: SORT_ITEMS, value: SORT_ITEMS[0] });
    barHeight = new formattingSettings.NumUpDown({ name: "barHeight", displayName: "实际值条的粗细（%）", value: 34 });
    missHighlight = new formattingSettings.ToggleSwitch({ name: "missHighlight", displayName: "没达标换颜色", value: true });

    name: string = "layout";
    displayName: string = "布局";
    slices: Array<FormattingSettingsSlice> = [this.scale, this.sort, this.barHeight, this.missHighlight];
}

class LabelsCard extends FormattingSettingsCard {
    showValue = new formattingSettings.ToggleSwitch({ name: "showValue", displayName: "显示实际值", value: true });
    showRate = new formattingSettings.ToggleSwitch({ name: "showRate", displayName: "显示完成率", value: true });
    unit = new formattingSettings.ItemDropdown({ name: "unit", displayName: "数值单位", items: UNIT_ITEMS, value: UNIT_ITEMS[0] });
    showLegend = new formattingSettings.ToggleSwitch({ name: "showLegend", displayName: "显示图例", value: true });

    name: string = "labels";
    displayName: string = "标签";
    slices: Array<FormattingSettingsSlice> = [this.showValue, this.showRate, this.unit, this.showLegend];
}

class TextCard extends FormattingSettingsCard {
    useTheme = new formattingSettings.ToggleSwitch({ name: "useTheme", displayName: "颜色跟随报表主题", value: true });
    font = new formattingSettings.FontControl({
        name: "font",
        displayName: "字体",
        fontFamily: new formattingSettings.FontPicker({ name: "fontFamily", value: "Segoe UI, wf_segoe-ui_normal, helvetica, arial, sans-serif" }),
        fontSize: new formattingSettings.NumUpDown({ name: "fontSize", value: 10 }),
        bold: new formattingSettings.ToggleSwitch({ name: "bold", value: false })
    });
    color = new formattingSettings.ColorPicker({ name: "color", displayName: "文字颜色", value: { value: "#605E5C" } });

    name: string = "text";
    displayName: string = "文字";
    slices: Array<FormattingSettingsSlice> = [this.font, this.useTheme, this.color];
}

export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    colorsCard = new ColorsCard();
    bandsCard = new BandsCard();
    layoutCard = new LayoutCard();
    labelsCard = new LabelsCard();
    textCard = new TextCard();
    cards = [this.colorsCard, this.bandsCard, this.layoutCard, this.labelsCard, this.textCard];
}
