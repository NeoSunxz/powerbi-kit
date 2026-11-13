"use strict";

import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

// 各类别的颜色默认按报表主题的数据颜色依次取，和自带图一样；每个类别一个取色器，在 visual.ts 里按数据生成
class ColorsCard extends FormattingSettingsCard {
    name: string = "dataPoint";
    displayName: string = "颜色";
    slices: Array<FormattingSettingsSlice> = [];
}

export const SHAPE_ITEMS = [
    { value: "square", displayName: "方块" },
    { value: "circle", displayName: "圆点" }
];
export const SORT_ITEMS = [
    { value: "value", displayName: "按数值，从大到小" },
    { value: "none", displayName: "按字段原顺序" }
];
export const POSITION_ITEMS = [
    { value: "right", displayName: "右边" },
    { value: "bottom", displayName: "下面" }
];
export const UNIT_ITEMS = [
    { value: "auto", displayName: "自动（满 1 万显示「万」）" },
    { value: "none", displayName: "原值" }
];

class LayoutCard extends FormattingSettingsCard {
    shape = new formattingSettings.ItemDropdown({ name: "shape", displayName: "格子形状", items: SHAPE_ITEMS, value: SHAPE_ITEMS[0] });
    gap = new formattingSettings.NumUpDown({ name: "gap", displayName: "格子间距（%）", value: 14 });
    cornerRadius = new formattingSettings.NumUpDown({ name: "cornerRadius", displayName: "方块圆角", value: 3 });
    sort = new formattingSettings.ItemDropdown({ name: "sort", displayName: "排序", items: SORT_ITEMS, value: SORT_ITEMS[0] });

    name: string = "layout";
    displayName: string = "布局";
    slices: Array<FormattingSettingsSlice> = [this.shape, this.gap, this.cornerRadius, this.sort];
}

class LegendCard extends FormattingSettingsCard {
    show = new formattingSettings.ToggleSwitch({ name: "show", displayName: "显示图例", value: true });
    position = new formattingSettings.ItemDropdown({ name: "position", displayName: "位置", items: POSITION_ITEMS, value: POSITION_ITEMS[0] });
    showPercent = new formattingSettings.ToggleSwitch({ name: "showPercent", displayName: "显示占比", value: true });
    showValue = new formattingSettings.ToggleSwitch({ name: "showValue", displayName: "显示数值", value: false });
    unit = new formattingSettings.ItemDropdown({ name: "unit", displayName: "数值单位", items: UNIT_ITEMS, value: UNIT_ITEMS[0] });

    name: string = "legend";
    displayName: string = "图例";
    topLevelSlice = this.show;
    slices: Array<FormattingSettingsSlice> = [this.position, this.showPercent, this.showValue, this.unit];
}

class TextCard extends FormattingSettingsCard {
    useTheme = new formattingSettings.ToggleSwitch({ name: "useTheme", displayName: "颜色跟随报表主题", value: true });
    font = new formattingSettings.FontControl({
        name: "font",
        displayName: "字体",
        fontFamily: new formattingSettings.FontPicker({ name: "fontFamily", value: "Segoe UI, wf_segoe-ui_normal, helvetica, arial, sans-serif" }),
        fontSize: new formattingSettings.NumUpDown({ name: "fontSize", value: 11 }),
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
    legendCard = new LegendCard();
    textCard = new TextCard();
    cards = [this.colorsCard, this.layoutCard, this.legendCard, this.textCard];
}
