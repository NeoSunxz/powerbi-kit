"use strict";

import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

// 颜色默认跟随报表主题：强调色（前 3 名徽章、占比条、主数值）取主题第一个数据颜色，卡片底色取主题的视觉对象背景。
class ColorsCard extends FormattingSettingsCard {
    useTheme = new formattingSettings.ToggleSwitch({ name: "useTheme", displayName: "跟随报表主题", value: true });
    accent = new formattingSettings.ColorPicker({ name: "accent", displayName: "强调色", value: { value: "#2A669F" } });
    cardColor = new formattingSettings.ColorPicker({ name: "cardColor", displayName: "卡片底色", value: { value: "#FBF9F6" } });

    name: string = "colors";
    displayName: string = "颜色";
    slices: Array<FormattingSettingsSlice> = [this.useTheme, this.accent, this.cardColor];
}

export const RATIO_ITEMS = [
    { value: "1", displayName: "1:1 正方形" },
    { value: "0.75", displayName: "4:3 横图" },
    { value: "1.33", displayName: "3:4 竖图" }
];
export const FIT_ITEMS = [
    { value: "cover", displayName: "铺满裁切" },
    { value: "contain", displayName: "完整显示" }
];
export const SORT_ITEMS = [
    { value: "desc", displayName: "按主数值，从大到小" },
    { value: "none", displayName: "按字段原顺序" }
];
export const UNIT_ITEMS = [
    { value: "auto", displayName: "自动（满 1 万显示「万」）" },
    { value: "none", displayName: "原值" }
];

class LayoutCard extends FormattingSettingsCard {
    columns = new formattingSettings.NumUpDown({ name: "columns", displayName: "每行几张（0 = 自动）", value: 0 });
    minWidth = new formattingSettings.NumUpDown({ name: "minWidth", displayName: "卡片最小宽度（自动时）", value: 140 });
    gap = new formattingSettings.NumUpDown({ name: "gap", displayName: "卡片间距", value: 12 });
    radius = new formattingSettings.NumUpDown({ name: "radius", displayName: "卡片圆角", value: 10 });
    imageRatio = new formattingSettings.ItemDropdown({ name: "imageRatio", displayName: "图片比例", items: RATIO_ITEMS, value: RATIO_ITEMS[0] });
    imageFit = new formattingSettings.ItemDropdown({ name: "imageFit", displayName: "图片填充", items: FIT_ITEMS, value: FIT_ITEMS[0] });
    sort = new formattingSettings.ItemDropdown({ name: "sort", displayName: "排序", items: SORT_ITEMS, value: SORT_ITEMS[0] });

    name: string = "layout";
    displayName: string = "布局";
    slices: Array<FormattingSettingsSlice> = [this.columns, this.minWidth, this.gap, this.radius, this.imageRatio, this.imageFit, this.sort];
}

class LabelsCard extends FormattingSettingsCard {
    showRank = new formattingSettings.ToggleSwitch({ name: "showRank", displayName: "显示排名", value: true });
    topN = new formattingSettings.NumUpDown({ name: "topN", displayName: "前几名用强调色", value: 3 });
    showBar = new formattingSettings.ToggleSwitch({ name: "showBar", displayName: "显示占比条（和第 1 名比）", value: true });
    unit = new formattingSettings.ItemDropdown({ name: "unit", displayName: "数值单位", items: UNIT_ITEMS, value: UNIT_ITEMS[0] });

    name: string = "labels";
    displayName: string = "标签";
    slices: Array<FormattingSettingsSlice> = [this.showRank, this.topN, this.showBar, this.unit];
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
    color = new formattingSettings.ColorPicker({ name: "color", displayName: "文字颜色", value: { value: "#252423" } });

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
