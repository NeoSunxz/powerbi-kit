"use strict";

import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

// 颜色默认跟随报表主题：柱子取主题第一个数据颜色，累计折线用主题文字色。
// 关掉「跟随报表主题」才显示取色器；默认值取自燕麦拿铁主题。
class ColorsCard extends FormattingSettingsCard {
    useTheme = new formattingSettings.ToggleSwitch({ name: "useTheme", displayName: "跟随报表主题", value: true });
    barColor = new formattingSettings.ColorPicker({ name: "barColor", displayName: "柱子", value: { value: "#2A669F" } });
    lineColor = new formattingSettings.ColorPicker({ name: "lineColor", displayName: "累计折线", value: { value: "#2D2A26" } });

    name: string = "colors";
    displayName: string = "颜色";
    slices: Array<FormattingSettingsSlice> = [this.useTheme, this.barColor, this.lineColor];
}

class ThresholdCard extends FormattingSettingsCard {
    show = new formattingSettings.ToggleSwitch({ name: "show", displayName: "显示分界线", value: true });
    value = new formattingSettings.NumUpDown({ name: "value", displayName: "累计占比到（%）", value: 80 });

    name: string = "threshold";
    displayName: string = "分界线";
    slices: Array<FormattingSettingsSlice> = [this.show, this.value];
}

class LayoutCard extends FormattingSettingsCard {
    maxBars = new formattingSettings.NumUpDown({ name: "maxBars", displayName: "最多画几根柱子（其余合并）", value: 15 });
    otherName = new formattingSettings.TextInput({ name: "otherName", displayName: "合并后的名字", value: "其他", placeholder: "其他" });
    dimRest = new formattingSettings.ToggleSwitch({ name: "dimRest", displayName: "过线以后的柱子变浅", value: true });

    name: string = "layout";
    displayName: string = "布局";
    slices: Array<FormattingSettingsSlice> = [this.maxBars, this.otherName, this.dimRest];
}

export const UNIT_ITEMS = [
    { value: "auto", displayName: "自动（满 1 万显示「万」）" },
    { value: "none", displayName: "原值" }
];
export const CUM_ITEMS = [
    { value: "cross", displayName: "只写过线那个点" },
    { value: "all", displayName: "每个点都写" },
    { value: "none", displayName: "不写" }
];

class LabelsCard extends FormattingSettingsCard {
    showValue = new formattingSettings.ToggleSwitch({ name: "showValue", displayName: "柱子上写数值", value: true });
    unit = new formattingSettings.ItemDropdown({ name: "unit", displayName: "数值单位", items: UNIT_ITEMS, value: UNIT_ITEMS[0] });
    showCumulative = new formattingSettings.ItemDropdown({ name: "showCumulative", displayName: "累计占比", items: CUM_ITEMS, value: CUM_ITEMS[0] });
    showCallout = new formattingSettings.ToggleSwitch({ name: "showCallout", displayName: "左上角写「前 N 个占 X%」", value: true });

    name: string = "labels";
    displayName: string = "标签";
    slices: Array<FormattingSettingsSlice> = [this.showValue, this.unit, this.showCumulative, this.showCallout];
}

export const AXIS_ITEMS = [
    { value: "pct", displayName: "一把尺：只写百分比" },
    { value: "dual", displayName: "两把尺：左边数值、右边百分比" }
];

// 默认两把尺：左边数值按最高的柱子取刻度，柱子画得高；右边百分比管累计折线和分界线。也能换回一把 0–100% 的尺
class AxisCard extends FormattingSettingsCard {
    mode = new formattingSettings.ItemDropdown({ name: "mode", displayName: "纵轴", items: AXIS_ITEMS, value: AXIS_ITEMS[1] });

    name: string = "axis";
    displayName: string = "纵轴";
    slices: Array<FormattingSettingsSlice> = [this.mode];
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
    thresholdCard = new ThresholdCard();
    layoutCard = new LayoutCard();
    labelsCard = new LabelsCard();
    axisCard = new AxisCard();
    textCard = new TextCard();
    cards = [this.colorsCard, this.thresholdCard, this.layoutCard, this.labelsCard, this.axisCard, this.textCard];
}
