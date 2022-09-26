import type { AlignmentHorizontal, AlignmentVertical } from '../types/alignment';
import type {
    Background,
    GradientBackground,
    ImageBackground,
    SolidBackground,
    RadialBackground,
    RadialGradientCenter
} from '../types/background';
import type { ImageScale } from '../types/imageScale';
import type { MaybeMissing } from '../expressions/json';
import { correctColor } from './correctColor';
import { htmlFilter } from './htmlFilter';
import { Truthy } from './truthy';
import { pxToEmWithUnits } from './pxToEm';

export function getBackground(bgs: MaybeMissing<Background>[]): {
    color?: string;
    image?: string;
    size?: string;
    position?: string;
} {
    if (bgs.length === 1 && bgs[0].type === 'solid') {
        return solidUnique({
            bg: bgs[0]
        });
    }

    const res = bgs
        .map(bg => {
            if (bg.type === 'solid') {
                return solid({
                    bg
                });
            } else if (bg.type === 'gradient') {
                return gradient({
                    bg
                });
            } else if (bg.type === 'image') {
                return image({
                    bg
                });
            } else if (bg.type === 'radial') {
                return radial({
                    bg
                });
            }
        })
        .filter(Truthy)
        .reverse()
        .reduce(function(acc, item) {
            acc.image.push(item.image);
            acc.size.push(item.size || 'auto');
            acc.position.push(item.pos || '50% 50%');

            return acc;
        }, {
            image: [] as string[],
            size: [] as string[],
            position: [] as string[]
        });

    return {
        image: res.image.join(','),
        size: res.size.join(','),
        position: res.position.join(',')
    };
}

function solid(opts: {
    bg: MaybeMissing<SolidBackground>;
}): {
    size: string | undefined;
    pos: string | undefined;
    image: string;
} {
    const color = correctColor(opts.bg.color || 'transparent');

    return {
        size: undefined,
        pos: undefined,
        image: `linear-gradient(to bottom,${color},${color})`
    };
}

function solidUnique(opts: {
    bg: MaybeMissing<SolidBackground>;
}): {
    color: string;
    size: string;
    position: string;
} {
    const color = correctColor(opts.bg.color || 'transparent');

    return {
        color,
        size: 'auto',
        position: '50% 50%'
    };
}

function gradient(opts: {
    bg: MaybeMissing<GradientBackground>;
}): {
    size: string | undefined;
    pos: string | undefined;
    image: string;
} | undefined {
    if (!Array.isArray(opts.bg?.colors)) {
        return;
    }

    const colors = opts.bg.colors.filter(Truthy) as string[];
    if (!colors.length) {
        return;
    }

    return {
        size: undefined,
        pos: undefined,
        image:
            'linear-gradient(' +
            (90 - Number(opts.bg.angle || 0) + 'deg') +
            ',' +
            colors
                .map(color => correctColor(color))
                .join(',') +
            ')'
    };
}

const RELATIVE_SIZE_MAP = {
    nearest_corner: 'closest-corner',
    farthest_corner: 'farthest-corner',
    nearest_side: 'closest-side',
    farthest_side: 'farthest-side'
};

function radialCenterToCss(center: MaybeMissing<RadialGradientCenter> | undefined): string {
    if (center && typeof center === 'object' && 'type' in center && center.value !== undefined) {
        if (center.type === 'fixed') {
            return pxToEmWithUnits(center.value);
        } else if (center.type === 'relative') {
            return `${Number(center.value) * 100}%`;
        }
    }

    return '50%';
}

function radial(opts: {
    bg: MaybeMissing<RadialBackground>;
}): {
    size: string | undefined;
    pos: string | undefined;
    image: string;
} | undefined {
    if (!Array.isArray(opts.bg?.colors)) {
        return;
    }

    const colors = opts.bg.colors.filter(Truthy) as string[];
    if (!colors.length) {
        return;
    }

    const sizeVal = opts.bg.radius;
    let size;
    if (sizeVal && typeof sizeVal === 'object' && 'type' in sizeVal && sizeVal.value !== undefined) {
        if (sizeVal.type === 'fixed') {
            size = pxToEmWithUnits(sizeVal.value);
        } else if (sizeVal.type === 'relative') {
            size = RELATIVE_SIZE_MAP[sizeVal.value];
        }
    }

    const centerX = radialCenterToCss(opts.bg.center_x);
    const centerY = radialCenterToCss(opts.bg.center_y);

    return {
        size: undefined,
        pos: undefined,
        image:
            'radial-gradient(' +
            `circle ${size || 'farthest-corner'} at ${centerX} ${centerY}` +
            ',' +
            colors
                .map(color => correctColor(color))
                .join(',') +
            ')'
    };
}

function image(opts: {
    bg: MaybeMissing<ImageBackground>;
}): {
    size: string | undefined;
    pos: string | undefined;
    image: string;
} | undefined {
    const image = opts.bg?.image_url;

    if (!image) {
        return;
    }

    return {
        size: imageSize(opts.bg.scale),
        pos: imagePos(opts.bg),
        image: 'url("' + htmlFilter(image) + '")'
    };
}

export function imageSize(scale?: ImageScale): string | undefined {
    if (scale === 'fill' || !scale) {
        return 'cover';
    } else if (scale === 'fit') {
        return 'contain';
    }
}

export function imagePos(obj: {
    content_alignment_horizontal?: AlignmentHorizontal;
    content_alignment_vertical?: AlignmentVertical;
}): string {
    let hpos: string;
    let vpos: string;

    if (obj.content_alignment_horizontal === 'left') {
        hpos = '0%';
    } else if (obj.content_alignment_horizontal === 'right') {
        hpos = '100%';
    } else {
        hpos = '50%';
    }

    if (obj.content_alignment_vertical === 'top') {
        vpos = '0%';
    } else if (obj.content_alignment_vertical === 'bottom') {
        vpos = '100%';
    } else {
        vpos = '50%';
    }

    return hpos + ' ' + vpos;
}
