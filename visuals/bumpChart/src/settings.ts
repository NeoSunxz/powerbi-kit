"use strict";

import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

// 颜色默认跟随报表主题：上色的线按主题数据颜色依次取，不上色的线是卡片底色往文字色走的灰。
// 关掉「跟随报表主题」才显示取色器（只管灰线）；默认值取自燕麦拿铁主题。
class ColorsCard extends FormattingSettingsCard {
    useTheme = new formattingSettings.ToggleSwitch({ name: "useTheme", displayName: "跟随报表主题", value: true });
    mutedColor = new formattingSettings.ColorPicker({ name: "mutedColor", displayName: "没上色的线", value: { value: "#CFC8BD" } });

    name: string = "colors";
    displayName: string = "颜色";
    slices: Array<FormattingSettingsSlice> = [this.useTheme, this.mutedColor];
}

export const EMPHASIS_ITEMS = [
    { value: "changed", displayName: "名次变过的上色，没变的灰色" },
    { value: "all", displayName: "全部上色" }
];
export const ORDER_ITEMS = [
    { value: "auto", displayName: "自动（按时间先后）" },
    { value: "none", displayName: "按字段原顺序" }
];

class LayoutCard extends FormattingSettingsCard {
    emphasis = new formattingSettings.ItemDropdown({ name: "emphasis", displayName: "上色", items: EMPHASIS_ITEMS, value: EMPHASIS_ITEMS[0] });
    order = new formattingSettings.ItemDropdown({ name: "order", displayName: "时间顺序", items: ORDER_ITEMS, value: ORDER_ITEMS[0] });
    lineWidth = new formattingSettings.NumUpDown({ name: "lineWidth", displayName: "线的粗细", value: 3 });
    curve = new formattingSettings.ToggleSwitch({ name: "curve", displayName: "线画成弯的", value: true });

    name: string = "layout";
    displayName: string = "布局";
    slices: Array<FormattingSettingsSlice> = [this.emphasis, this.order, this.lineWidth, this.curve];
}

class LabelsCard extends FormattingSettingsCard {
    showStart = new formattingSettings.ToggleSwitch({ name: "showStart", displayName: "左边写名字", value: true });
    showEnd = new formattingSettings.ToggleSwitch({ name: "showEnd", displayName: "右边写名字", value: true });
    showRankInDot = new formattingSettings.ToggleSwitch({ name: "showRankInDot", displayName: "点里写名次", value: false });

    name: string = "labels";
    displayName: string = "标签";
    slices: Array<FormattingSettingsSlice> = [this.showStart, this.showEnd, this.showRankInDot];
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
    layoutCard = new LayoutCard();
    labelsCard = new LabelsCard();
    textCard = new TextCard();
    cards = [this.colorsCard, this.layoutCard, this.labelsCard, this.textCard];
}
