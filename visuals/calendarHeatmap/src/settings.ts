"use strict";

import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

// 颜色默认跟随报表主题：最大值取主题第一个数据颜色，最小值是它的浅色。
// 关掉「跟随报表主题」才显示下面三个取色器；默认值取自燕麦拿铁主题。
class ColorsCard extends FormattingSettingsCard {
    useTheme = new formattingSettings.ToggleSwitch({ name: "useTheme", displayName: "跟随报表主题", value: true });
    lowColor = new formattingSettings.ColorPicker({ name: "lowColor", displayName: "最小值颜色", value: { value: "#E3ECF5" } });
    highColor = new formattingSettings.ColorPicker({ name: "highColor", displayName: "最大值颜色", value: { value: "#2A669F" } });
    emptyColor = new formattingSettings.ColorPicker({ name: "emptyColor", displayName: "没有数据的日子", value: { value: "#F3F2F1" } });

    name: string = "colors";
    displayName: string = "颜色";
    slices: Array<FormattingSettingsSlice> = [this.useTheme, this.lowColor, this.highColor, this.emptyColor];
}

class LayoutCard extends FormattingSettingsCard {
    mondayFirst = new formattingSettings.ToggleSwitch({ name: "mondayFirst", displayName: "周一开始", value: true });
    showMonths = new formattingSettings.ToggleSwitch({ name: "showMonths", displayName: "显示月份", value: true });
    cornerRadius = new formattingSettings.NumUpDown({ name: "cornerRadius", displayName: "格子圆角", value: 2 });

    name: string = "layout";
    displayName: string = "布局";
    slices: Array<FormattingSettingsSlice> = [this.mondayFirst, this.showMonths, this.cornerRadius];
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

export const LEGEND_LABELS = [
    { value: "text", displayName: "文字（少 / 多）" },
    { value: "values", displayName: "最小值 / 最大值" }
];
export const LEGEND_POSITIONS = [
    { value: "bottomRight", displayName: "右下" },
    { value: "bottomLeft", displayName: "左下" },
    { value: "topRight", displayName: "右上" },
    { value: "topLeft", displayName: "左上" }
];

class LegendCard extends FormattingSettingsCard {
    show = new formattingSettings.ToggleSwitch({ name: "show", displayName: "显示图例", value: true });
    position = new formattingSettings.ItemDropdown({ name: "position", displayName: "位置", items: LEGEND_POSITIONS, value: LEGEND_POSITIONS[0] });
    labelType = new formattingSettings.ItemDropdown({ name: "labelType", displayName: "两端显示", items: LEGEND_LABELS, value: LEGEND_LABELS[0] });
    lowText = new formattingSettings.TextInput({ name: "lowText", displayName: "左端文字", value: "少", placeholder: "少" });
    highText = new formattingSettings.TextInput({ name: "highText", displayName: "右端文字", value: "多", placeholder: "多" });
    boxSize = new formattingSettings.NumUpDown({ name: "boxSize", displayName: "色块大小", value: 16 });
    steps = new formattingSettings.NumUpDown({ name: "steps", displayName: "色块个数", value: 5 });
    fontSize = new formattingSettings.NumUpDown({ name: "fontSize", displayName: "文字大小", value: 11 });

    name: string = "legend";
    displayName: string = "图例";
    topLevelSlice = this.show;
    slices: Array<FormattingSettingsSlice> = [this.position, this.labelType, this.lowText, this.highText, this.boxSize, this.steps, this.fontSize];
}

export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    colorsCard = new ColorsCard();
    layoutCard = new LayoutCard();
    textCard = new TextCard();
    legendCard = new LegendCard();
    cards = [this.colorsCard, this.layoutCard, this.textCard, this.legendCard];
}
