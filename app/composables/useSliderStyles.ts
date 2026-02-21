import type { SliderItem } from "./useSliderItems";

export type NumericStyle = {
  opacity: number;
  rotateY: number;
  translateX: number;
  translateZ: number;
  scale: number;
  blur: number;
  containerTranslateX: number;
  zIndex: number;
};

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function lerp(start: number, end: number, value: number) {
  return start + (end - start) * value;
}

function getBaseParams(windowSize: number) {
  const length = windowSize;
  const maxDepth = Math.min(length * 40, 500);
  return {
    length,
    last: length - 1 || 1,
    maxRotate: Math.min(length * 3, 75),
    maxDepth,
    minScale: clamp(1 - length * 0.05, 0.4, 0.9),
    maxBlur: 60,
  };
}

function getVisibleStyleValues(
  index: number,
  windowSize: number,
): NumericStyle {
  const { length, last, maxRotate, maxDepth, minScale, maxBlur } =
    getBaseParams(windowSize);
  const positionRatio = index / last;

  return {
    opacity: 100,
    rotateY: -(maxRotate * positionRatio + 2),
    translateX: index === 0 ? -60 : -50,
    translateZ: -maxDepth * positionRatio,
    scale: 1 - (1 - minScale) * positionRatio,
    blur: maxBlur * positionRatio,
    containerTranslateX: (50 / (length || 1)) * index,
    zIndex: length - index + 2,
  };
}

export function buildStyle(styleValues: NumericStyle) {
  return {
    imageStyle: {
      opacity: `${styleValues.opacity}%`,
      transform: `
        perspective(1000px)
        rotateY(${styleValues.rotateY}deg)
        translateX(${styleValues.translateX}%)
        translateZ(${styleValues.translateZ}px)
        scale(${styleValues.scale})
      `,
      filter: `blur(${styleValues.blur}px)`,
    },
    containerStyle: {
      zIndex: `${Math.round(styleValues.zIndex)}`,
      transform: `translateX(${styleValues.containerTranslateX}%)`,
    },
  };
}

function interpolateStyle(
  from: NumericStyle,
  to: NumericStyle,
  value: number,
): NumericStyle {
  return {
    opacity: lerp(from.opacity, to.opacity, value),
    rotateY: lerp(from.rotateY, to.rotateY, value),
    translateX: lerp(from.translateX, to.translateX, value),
    translateZ: lerp(from.translateZ, to.translateZ, value),
    scale: lerp(from.scale, to.scale, value),
    blur: lerp(from.blur, to.blur, value),
    containerTranslateX: lerp(
      from.containerTranslateX,
      to.containerTranslateX,
      value,
    ),
    zIndex: lerp(from.zIndex, to.zIndex, value),
  };
}

function getFirstInvisibleStyle(windowSize: number): NumericStyle {
  return {
    opacity: 0,
    rotateY: 0,
    translateX: -50,
    translateZ: 0,
    scale: 1,
    blur: 10,
    containerTranslateX: -50,
    zIndex: windowSize * 2 + 100,
  };
}

function getLastInvisibleStyle(windowSize: number): NumericStyle {
  const { maxDepth } = getBaseParams(windowSize);
  return {
    opacity: 0,
    rotateY: -32,
    translateX: -50,
    translateZ: -maxDepth,
    scale: 0.05,
    blur: 100,
    containerTranslateX: 50,
    zIndex: 0,
  };
}

function getInterpolatedStyle(
  position: number,
  windowSize: number,
): NumericStyle {
  const length = windowSize;
  if (!length) return getFirstInvisibleStyle(windowSize);

  if (position <= -1) return getFirstInvisibleStyle(windowSize);
  if (position >= length) return getLastInvisibleStyle(windowSize);

  if (position < 0) {
    const amount = position + 1;
    return interpolateStyle(
      getFirstInvisibleStyle(windowSize),
      getVisibleStyleValues(0, windowSize),
      amount,
    );
  }

  if (position > length - 1) {
    const amount = position - (length - 1);
    return interpolateStyle(
      getVisibleStyleValues(length - 1, windowSize),
      getLastInvisibleStyle(windowSize),
      amount,
    );
  }

  const startIndex = Math.floor(position);
  const endIndex = Math.min(startIndex + 1, length - 1);
  const amount = position - startIndex;

  return interpolateStyle(
    getVisibleStyleValues(startIndex, windowSize),
    getVisibleStyleValues(endIndex, windowSize),
    amount,
  );
}

export function applyProgressStyles(
  items: SliderItem[],
  progress: number,
  windowSize: number,
): SliderItem[] {
  return items.map((item, index) => {
    const styleValues = getInterpolatedStyle(index - progress - 1, windowSize);
    const newStyle = buildStyle(styleValues);

    return {
      ...item,
      img: {
        ...item.img,
        style: newStyle.imageStyle,
        containerStyle: newStyle.containerStyle,
      },
    };
  });
}
