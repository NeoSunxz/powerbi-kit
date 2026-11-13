"use strict";

import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

// 颜色默认跟随报表主题：终点（涨）取主题第一个数据颜色，终点（跌）取第三个，起点是灰色。
// 关掉「跟随报表主题」才显示取色器；默认值取自燕麦拿铁主题。
class ColorsCard extends FormattingSettingsCard {
    useTheme = new formattingSettings.ToggleSwitch({ name: "useTheme", displayName: "跟随报表主题", value: true });
    startColor = new formattingSettings.ColorPicker({ name: "startColor", displayName: "起点", value: { value: "#B9B2A8" } });
    upColor = new formattingSettings.ColorPicker({ name: "upColor", displayName: "终点（涨）", value: { value: "#2A669F" } });
    downColor = new formattingSettings.ColorPicker({ name: "downColor", displayName: "终点（跌）", value: { value: "#A95960" } });

    name: string = "colors";
    displayName: string = "颜色";
    slices: Array<FormattingSettingsSlice> = [this.useTheme, this.startColor, this.upColor, this.downColor];
}

export const SORT_ITEMS = [
    { value: "end", displayName: "按终点值，从大到小" },
    { value: "change", displayName: "按变化幅度，从大到小" },
    { value: "none", displayName: "按字段原顺序" }
];
export const UNIT_ITEMS = [
    { value: "auto", displayName: "自动（满 1 万显示「万」）" },
    { value: "none", displayName: "原值" }
];

class LayoutCard extends FormattingSettingsCard {
    sort = new formattingSettings.ItemDropdown({ name: "sort", displayName: "排序", items: SORT_ITEMS, value: SORT_ITEMS[0] });
    zeroBased = new formattingSettings.ToggleSwitch({ name: "zeroBased", displayName: "坐标从 0 开始", value: false });
    dotSize = new formattingSettings.NumUpDown({ name: "dotSize", displayName: "圆点大小", value: 7 });
    lineWidth = new formattingSettings.NumUpDown({ name: "lineWidth", displayName: "连线粗细", value: 3 });

    name: string = "layout";
    displayName: string = "布局";
    slices: Array<FormattingSettingsSlice> = [this.sort, this.zeroBased, this.dotSize, this.lineWidth];
}

class LabelsCard extends FormattingSettingsCard {
    showValues = new formattingSettings.ToggleSwitch({ name: "showValues", displayName: "显示两端数值", value: true });
    showChange = new formattingSettings.ToggleSwitch({ name: "showChange", displayName: "显示变化百分比", value: true });
    unit = new formattingSettings.ItemDropdown({ name: "unit", displayName: "数值单位", items: UNIT_ITEMS, value: UNIT_ITEMS[0] });
    showLegend = new formattingSettings.ToggleSwitch({ name: "showLegend", displayName: "显示图例", value: true });

    name: string = "labels";
    displayName: string = "标签";
    slices: Array<FormattingSettingsSlice> = [this.showValues, this.showChange, this.unit, this.showLegend];
}

// 文字：字体、字号、颜色；颜色默认跟随报表主题（和自带图的图例、坐标轴标签同色），关掉才显示取色器
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
    layoutCard = new LayoutCard();
    labelsCard = new LabelsCard();
    textCard = new TextCard();
    cards = [this.colorsCard, this.layoutCard, this.labelsCard, this.textCard];
}
