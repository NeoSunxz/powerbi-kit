"use strict";

import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

export const COLOR_MODES = [
    { value: "gradient", displayName: "渐变（主题第一个颜色，从深到浅）" },
    { value: "theme", displayName: "按类别（主题颜色轮换）" },
    { value: "custom", displayName: "自己选每个类别" }
];

// 颜色方式固定在最上面；选「自己选每个类别」时，每个类别一个取色器，在 visual.ts 里按数据生成
class ColorsCard extends FormattingSettingsCard {
    mode = new formattingSettings.ItemDropdown({ name: "mode", displayName: "颜色方式", items: COLOR_MODES, value: COLOR_MODES[0] });

    name: string = "colors";
    displayName: string = "颜色";
    slices: Array<FormattingSettingsSlice> = [this.mode];
}

class DataPointCard extends FormattingSettingsCard {
    name: string = "dataPoint";
    displayName: string = "每个类别的颜色";
    slices: Array<FormattingSettingsSlice> = [];
}

export const SORT_ITEMS = [
    { value: "desc", displayName: "按数值，从大到小" },
    { value: "none", displayName: "按字段原顺序" }
];
export const RADIUS_MODES = [
    { value: "value", displayName: "半径按数值（从 0 开始）" },
    { value: "area", displayName: "面积按数值" },
    { value: "range", displayName: "突出差异（最小值到最大值）" }
];
export const UNIT_ITEMS = [
    { value: "auto", displayName: "自动（满 1 万显示「万」）" },
    { value: "none", displayName: "原值" }
];

class LayoutCard extends FormattingSettingsCard {
    sort = new formattingSettings.ItemDropdown({ name: "sort", displayName: "排序", items: SORT_ITEMS, value: SORT_ITEMS[0] });
    radiusMode = new formattingSettings.ItemDropdown({ name: "radiusMode", displayName: "花瓣长短", items: RADIUS_MODES, value: RADIUS_MODES[0] });
    innerRadius = new formattingSettings.NumUpDown({ name: "innerRadius", displayName: "中间留空（%）", value: 18 });
    padAngle = new formattingSettings.NumUpDown({ name: "padAngle", displayName: "花瓣间隙", value: 1 });
    cornerRadius = new formattingSettings.NumUpDown({ name: "cornerRadius", displayName: "花瓣圆角", value: 3 });

    name: string = "layout";
    displayName: string = "布局";
    slices: Array<FormattingSettingsSlice> = [this.sort, this.radiusMode, this.innerRadius, this.padAngle, this.cornerRadius];
}

class LabelsCard extends FormattingSettingsCard {
    show = new formattingSettings.ToggleSwitch({ name: "show", displayName: "显示标签", value: true });
    showValue = new formattingSettings.ToggleSwitch({ name: "showValue", displayName: "标签带数值", value: true });
    unit = new formattingSettings.ItemDropdown({ name: "unit", displayName: "数值单位", items: UNIT_ITEMS, value: UNIT_ITEMS[0] });

    name: string = "labels";
    displayName: string = "标签";
    topLevelSlice = this.show;
    slices: Array<FormattingSettingsSlice> = [this.showValue, this.unit];
}

// 中间留空够大时，写合计和标题
class CenterCard extends FormattingSettingsCard {
    show = new formattingSettings.ToggleSwitch({ name: "show", displayName: "中间显示合计", value: true });
    title = new formattingSettings.TextInput({ name: "title", displayName: "合计下面的文字", value: "", placeholder: "默认用度量值名称" });

    name: string = "center";
    displayName: string = "中间";
    topLevelSlice = this.show;
    slices: Array<FormattingSettingsSlice> = [this.title];
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
    dataPointCard = new DataPointCard();
    layoutCard = new LayoutCard();
    labelsCard = new LabelsCard();
    centerCard = new CenterCard();
    textCard = new TextCard();
    cards = [this.colorsCard, this.dataPointCard, this.layoutCard, this.labelsCard, this.centerCard, this.textCard];
}
