"use strict";

import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

// 默认色取自燕麦拿铁主题：主色 #2A669F 由浅到深
class ColorsCard extends FormattingSettingsCard {
    lowColor = new formattingSettings.ColorPicker({ name: "lowColor", displayName: "最小值颜色", value: { value: "#E3ECF5" } });
    highColor = new formattingSettings.ColorPicker({ name: "highColor", displayName: "最大值颜色", value: { value: "#2A669F" } });
    emptyColor = new formattingSettings.ColorPicker({ name: "emptyColor", displayName: "没有数据的日子", value: { value: "#EFEBE5" } });

    name: string = "colors";
    displayName: string = "颜色";
    slices: Array<FormattingSettingsSlice> = [this.lowColor, this.highColor, this.emptyColor];
}

class LayoutCard extends FormattingSettingsCard {
    mondayFirst = new formattingSettings.ToggleSwitch({ name: "mondayFirst", displayName: "周一开始", value: true });
    showMonths = new formattingSettings.ToggleSwitch({ name: "showMonths", displayName: "显示月份", value: true });
    cornerRadius = new formattingSettings.NumUpDown({ name: "cornerRadius", displayName: "格子圆角", value: 2 });
    fontSize = new formattingSettings.NumUpDown({ name: "fontSize", displayName: "文字大小", value: 10 });

    name: string = "layout";
    displayName: string = "布局";
    slices: Array<FormattingSettingsSlice> = [this.mondayFirst, this.showMonths, this.cornerRadius, this.fontSize];
}

export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    colorsCard = new ColorsCard();
    layoutCard = new LayoutCard();
    cards = [this.colorsCard, this.layoutCard];
}
