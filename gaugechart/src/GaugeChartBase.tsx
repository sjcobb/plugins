// Copyright 2023 The Perses Authors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { EChart, useChartsTheme } from '@perses-dev/components';
import { formatValue, FormatOptions } from '@perses-dev/core';
import { use, EChartsCoreOption } from 'echarts/core';
import { GaugeChart as EChartsGaugeChart, GaugeSeriesOption } from 'echarts/charts';
import { GridComponent, TitleComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { ReactElement, useMemo } from 'react';

use([EChartsGaugeChart, GridComponent, TitleComponent, TooltipComponent, CanvasRenderer]);

const PROGRESS_WIDTH = 16;

// Breakpoints used for responsively sizing arrow and progress width
const GAUGE_SMALL_BREAKPOINT = 170;
const GAUGE_MAX_BREAKPOINT = 800;

// These are all constant values for sizing the gauge chart.
// Not calculated but rather decided off of how they look
const TITLE_HEIGHT = 12;
const THRESHOLDS_LINE_WIDTH = 5;
const SPACING_BETWEEN_THRESHOLDS_AND_PROGRESS = 10;
const MIN_POINTER_LENGTH = 8;
const MAX_POINTER_LENGTH = 16;

const MIN_PROGRESS_WIDTH = 16;
const MAX_PROGRESS_WIDTH = 32;

const SPACING_BETWEEN_PROGRESS_AND_POINTER = 5;
const SPACING_BETWEEN_MESSAGE_AND_TITLE = 8;

export type GaugeChartValue = number | null | undefined;

export type GaugeSeries = {
  value: GaugeChartValue;
  label: string;
};

export interface GaugeChartBaseProps {
  width: number;
  height: number;
  data: GaugeSeries;
  format: FormatOptions;
  axisLine: GaugeSeriesOption['axisLine'];
  max?: number;
}

export function GaugeChartBase(props: GaugeChartBaseProps): ReactElement {
  const { width, height, data, format, axisLine, max } = props;
  const chartsTheme = useChartsTheme();

  const valueToDisplay = data.value ?? null;

  const layout = useMemo(() => {
    return calculateGaugeLayout({
      width,
      height,
      showValue: true,
      value: valueToDisplay,
      unit: format,
    });
  }, [width, height, format, valueToDisplay]);

  console.log('layout', layout);

  // useDeepMemo ensures value size util does not rerun everytime you hover on the chart
  const option: EChartsCoreOption = useMemo(() => {
    if (data.value === undefined) return chartsTheme.noDataOption;

    return {
      title: {
        show: false,
      },
      tooltip: {
        show: false,
      },
      series: [
        {
          type: 'gauge',
          center: ['50%', '65%'],
          radius: '86%',
          startAngle: 200,
          endAngle: -20,
          min: 0,
          max,
          silent: true,
          progress: {
            show: true,
            width: layout.progressWidth,
            itemStyle: {
              color: 'auto',
            },
          },
          pointer: {
            show: false,
          },
          axisLine: {
            lineStyle: {
              color: [[1, 'rgba(127,127,127,0.35)']], // TODO (sjcobb): use future chart theme colors
              width: PROGRESS_WIDTH,
            },
          },
          axisTick: {
            show: false,
            distance: 0,
          },
          splitLine: {
            show: false,
          },
          axisLabel: {
            show: false,
            distance: -18,
            color: '#999',
            fontSize: 12,
          },
          anchor: {
            show: false,
          },
          title: {
            show: false,
          },
          detail: {
            show: false,
          },
          data: [
            {
              value: data.value,
            },
          ],
        },
        {
          type: 'gauge',
          center: ['50%', '65%'],
          radius: '100%',
          startAngle: 200,
          endAngle: -20,
          min: 0,
          max,
          pointer: {
            show: false,
          },
          axisLine,
          axisTick: {
            show: false,
          },
          splitLine: {
            show: false,
          },
          axisLabel: {
            show: false,
          },
          detail: {
            show: true,
            width: layout.valueBoxWidth,
            height: layout.valueBoxHeight,
            padding: [0, 0, 0, 0],
            overflow: 'none',
            borderRadius: 8,
            offsetCenter: [0, layout.valueBoxOffset * -1],
            color: 'inherit', // allows value color to match active threshold color
            fontSize: layout.valueBoxHeight,
            formatter:
              data.value === null
                ? // We use a different function when we *know* the value is null
                  // at this level because the `formatter` function argument is `NaN`
                  // when the value is `null`, making it difficult to differentiate
                  // `null` from a true `NaN` case.
                  (): string => 'null'
                : (value: number): string | undefined => {
                    return formatValue(value, format);
                  },
          },
          data: [
            {
              value: data.value,
              name: data.label,
              // TODO: new UX for series names, create separate React component or reuse ListLegendItem
              // https://echarts.apache.org/en/option.html#series-gauge.data.title
              title: {
                show: true,
                color: chartsTheme.echartsTheme.textStyle?.color ?? 'inherit', // series name font color
                offsetCenter: [0, '55%'],
                overflow: 'truncate',
                fontSize: 12,
                width: width * 0.8,
              },
            },
          ],
        },
      ],
    };
  }, [data, width, chartsTheme, format, axisLine, max, layout]);

  return (
    <EChart
      sx={{
        width: width,
        height: height,
        padding: `${chartsTheme.container.padding.default}px`,
      }}
      option={option}
      theme={chartsTheme.echartsTheme}
    />
  );
}

/**
 * Responsive font size depending on number of characters, clamp used
 * to ensure size stays within given range
 */
export function getResponsiveValueSize(
  value: number | null,
  format: FormatOptions,
  width: number,
  height: number
): string {
  const MIN_SIZE = 3;
  const MAX_SIZE = 24;
  const SIZE_MULTIPLIER = 0.7;
  const formattedValue = typeof value === 'number' ? formatValue(value, format) : `${value}`;
  const valueCharacters = formattedValue.length ?? 2;
  const valueSize = (Math.min(width, height) / valueCharacters) * SIZE_MULTIPLIER;
  return `clamp(${MIN_SIZE}px, ${valueSize}px, ${MAX_SIZE}px)`;
}

function calculateGaugeLayout({
  width,
  height,
  value,
  unit,
  showValue,
}: {
  width: number;
  height: number;
  value: number | null;
  unit: FormatOptions;
  showValue: boolean;
}) {
  const dimension = Math.min(width, height);
  // Max radius size is 1/2 of the square the chart is rendered in
  const radius = dimension / 2;
  const thresholdsRadius = radius;

  const breakpointSpan = GAUGE_MAX_BREAKPOINT - GAUGE_SMALL_BREAKPOINT;

  const breakpointPercent =
    dimension <= GAUGE_SMALL_BREAKPOINT ? 0 : Math.min((dimension - GAUGE_SMALL_BREAKPOINT) / breakpointSpan, 1);

  const progressWidth = Math.floor(MIN_PROGRESS_WIDTH + (MAX_PROGRESS_WIDTH - MIN_PROGRESS_WIDTH) * breakpointPercent);

  // We need to add 15% of the height to everything that is positioned outside of the actual chart
  const heightOffset = 0.15 * height;

  let spacingBetweenThresholdsAndProgress = SPACING_BETWEEN_THRESHOLDS_AND_PROGRESS;
  if (dimension < GAUGE_SMALL_BREAKPOINT) {
    spacingBetweenThresholdsAndProgress = spacingBetweenThresholdsAndProgress / 2;
  }

  // The title for the chart is offset by 64% of the radius
  // This is just a random number that puts it in the place that seems right
  const titleVerticalCenter = 0.64 * 0.86 * radius;

  const progressGaugeRadius = thresholdsRadius - THRESHOLDS_LINE_WIDTH - spacingBetweenThresholdsAndProgress;

  const pointerLength = Math.floor(MIN_POINTER_LENGTH + (MAX_POINTER_LENGTH - MIN_POINTER_LENGTH) * breakpointPercent);

  // This is radius for the arc that the pointer moves around.
  // pointer is positioned with the end opposite the point positioned on this arc which is
  // why we have to subtract the pointer length
  let pointerOffset = progressGaugeRadius - progressWidth - SPACING_BETWEEN_PROGRESS_AND_POINTER - pointerLength;

  if (width < GAUGE_SMALL_BREAKPOINT) {
    // If we are in the small breakpoint, we will not show this icon.
    // This resets the pointer offset which is used for calculating text box width
    // to just inside of the progress gauge
    pointerOffset = progressGaugeRadius - progressWidth - SPACING_BETWEEN_PROGRESS_AND_POINTER;
  }

  // The ideal text box inside of the gauge is the square inscribed inside the
  // the pointer circle.  The formula sqrt(2) * radius gives us the width of that square
  const valueBoxWidth = Math.floor(Math.sqrt(2) * pointerOffset);

  // Our "target" value message box height is 2/3 of the square.
  // This leaves 1/3 + slightly more for the message
  const oneThirdWidth = Math.floor(valueBoxWidth / 3);
  const optimalTextBoxHeight = oneThirdWidth * 2;

  // We need to push the center of the textbox up so it aligns with the top of the gauge
  const valueBoxOffset = (1 / 2) * oneThirdWidth;

  // Now that we have our ideal text box dimensions, we find the text size that actually fits in it
  // we can then adjust the box size to give the message as much space as possible
  const valueFontSize = findOptimalFontSize(value, unit, valueBoxWidth, optimalTextBoxHeight);
  const valueBoxHeight = valueFontSize;

  // Figure out where the messageBox can start.
  // It should be half of the actual text box height below the text box offset
  const messageBoxTop = valueBoxHeight / 2 - valueBoxOffset;
  const messageBoxBottom = titleVerticalCenter - TITLE_HEIGHT / 2 - SPACING_BETWEEN_MESSAGE_AND_TITLE;
  let optimalMessageBoxHeight = messageBoxBottom - messageBoxTop;

  // The message box can be wider than the value text box because of where it falls on the circle
  // It's width can be the width across from the 2 end points of the gauge
  // This is the formula for finding the length of a chord of a circle. 2 * r * sin(angle/2)
  const messageBoxWidth = 2 * pointerOffset * Math.sin(Math.PI / 3);

  // Absolute position for the message box will be the center - half the width
  let messageBoxAbsoluteX = width / 2 - messageBoxWidth / 2;

  // Distance from pointerOffset to the top of the optimal box
  const pointerToOptimalBoxTopDistance = pointerOffset - valueBoxWidth / 2;

  // Extra space from the diff between dimension and height
  // Half of this needs to be added onto the messageBoxAbsoluteY
  const extraVerticalSpace = Math.floor((height - dimension) / 2);

  // radius - pointeroffset gives distance from outer radius to pointer offset radius
  // pointerToOptimalBoxTopDistance
  // optimaltextboxheight
  // take away half the difference between optimal and actual
  let messageBoxAbsoluteY =
    extraVerticalSpace +
    radius -
    pointerOffset +
    pointerToOptimalBoxTopDistance +
    optimalTextBoxHeight -
    (optimalTextBoxHeight - valueBoxHeight) / 2;

  if (!showValue) {
    // Special case. We are only showing the message
    // The message gets the optimal value text box space
    optimalMessageBoxHeight = optimalTextBoxHeight;
    messageBoxAbsoluteX = width / 2 - messageBoxWidth / 2;
    messageBoxAbsoluteY = extraVerticalSpace + radius - pointerOffset + pointerToOptimalBoxTopDistance;
  }

  return {
    messageBoxHeight: optimalMessageBoxHeight,
    messageBoxWidth,
    messageBoxAbsoluteX,
    messageBoxAbsoluteY: messageBoxAbsoluteY + heightOffset,
    pointerLength,
    pointerOffset,
    progressGaugeRadius,
    progressWidth,
    radius,
    titleVerticalCenter,
    valueBoxHeight,
    valueBoxWidth,
    valueBoxOffset,
  };
}

let canvasContext: CanvasRenderingContext2D | null | undefined = undefined;

function measureText(text: string, font = '') {
  // Init if we haven't yet
  if (canvasContext === undefined) {
    canvasContext = document.createElement('canvas').getContext('2d');
  }

  // Browser doesn't support '2d' context
  if (canvasContext === null) {
    return undefined;
  }

  canvasContext.font = font;
  return canvasContext.measureText(text);
}

function findOptimalFontSize(value: number | string | null, unit: FormatOptions, width: number, height: number) {
  const formattedValue = typeof value === 'number' ? formatValue(value, unit) : `${value}`;

  const fontSize = 12;
  const fontFamily = 'Lato';

  // set the font on the canvas context
  const fontStyle = `${400} ${fontSize}px ${fontFamily}`;

  const textMetrics = measureText(formattedValue, fontStyle);

  if (!textMetrics) {
    return 12;
  }

  // check how much bigger we can make the font while staying within the width and height
  const fontSizeBasedOnWidth = (width / textMetrics.width) * fontSize;
  const fontSizeBasedOnHeight = height;

  // return the smaller font size
  const finalFontSize = Math.min(fontSizeBasedOnHeight, fontSizeBasedOnWidth);
  return finalFontSize;
}
