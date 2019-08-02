/*
 Copyright (c) 2017-2018 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
  worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
  not use Cocos Creator software for developing other software or tools that's
  used for developing games. You are not granted to publish, distribute,
  sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
*/

/**
 * @category asset
 */

// @ts-check
import { Texture2D, TrivialTexture } from '../../assets';
import { ImageAsset } from '../../assets/image-asset';
import { PresumedGFXTextureInfo, PresumedGFXTextureViewInfo } from '../../assets/simple-texture';
import { ITexture2DCreateInfo } from '../../assets/texture-2d';
import { ccclass, property } from '../../core/data/class-decorator';
import { GFXTextureFlagBit, GFXTextureType, GFXTextureViewType } from '../../gfx/define';

export type ITextureCubeCreateInfo = ITexture2DCreateInfo;

/**
 * 立方体贴图的 Mipmap。
 */
interface ITextureCubeMipmap {
    front: ImageAsset;
    back: ImageAsset;
    left: ImageAsset;
    right: ImageAsset;
    top: ImageAsset;
    bottom: ImageAsset;
}

/**
 * 立方体每个面的约定索引。
 */
enum FaceIndex {
    right = 0,
    left = 1,
    top = 2,
    bottom = 3,
    front = 4,
    back = 5,
}

/**
 * 立方体贴图资源。
 * 立方体贴图资源的每个 Mipmap 层级都为 6 张图像资源，分别代表了立方体贴图的 6 个面。
 */
@ccclass('cc.TextureCube')
export class TextureCube extends TrivialTexture {
    public static FaceIndex = FaceIndex;

    /**
     * 此贴图的像素宽度。
     */
    public get width (): number {
        return this._width;
    }

    /**
     * 此贴图的像素高度。
     */
    public get height (): number {
        return this._height;
    }

    /**
     * 所有层级 Mipmap，注意，这里不包含自动生成的 Mipmap。
     * 当设置 Mipmap 时，贴图的尺寸以及像素格式可能会改变。
     */
    get mipmaps () {
        return this._mipmaps;
    }

    set mipmaps (value) {
        this._mipmaps = value;
        this._setMipmapLevel(this._mipmaps.length);
        if (this._mipmaps.length > 0) {
            const imageAsset: ImageAsset = this._mipmaps[0].front;
            this.reset({
                width: imageAsset.width,
                height: imageAsset.height,
                format: imageAsset.format,
                mipmapLevel: this._mipmaps.length,
            });
            this._mipmaps.forEach((mipmap, level) => {
                _forEachFace(mipmap, (face, faceIndex) => {
                    this._assignImage(face, level, faceIndex);
                });
            });
        } else {
            this.reset({
                width: 0,
                height: 0,
                mipmapLevel: this._mipmaps.length,
            });
        }
    }

    /**
     * 0 级 Mipmap。<br>
     * 注意，`this.image = i` 等价于 `this.mipmaps = [i]`，
     * 也就是说，通过 `this.image` 设置 0 级 Mipmap 时将隐式地清除之前的所有 Mipmap。
     */
    get image () {
        return this._mipmaps.length === 0 ? null : this._mipmaps[0];
    }

    set image (value) {
        this.mipmaps = value ? [value] : [];
    }

    /**
     * 通过二维贴图指定每个 Mipmap 的每个面创建立方体贴图。
     * @param textures 数组长度必须是6的倍数。
     * 每 6 个二维贴图依次构成立方体贴图的 Mipmap。6 个面应该按 `FaceIndex` 规定顺序排列。
     * @param out 出口立方体贴图，若未定义则将创建为新的立方体贴图。
     * @returns `out`
     * @example
     * ```typescript
     * const textures = new Array<Texture2D>(6);
     * textures[TextureCube.FaceIndex.front] = frontImage;
     * textures[TextureCube.FaceIndex.back] = backImage;
     * textures[TextureCube.FaceIndex.left] = leftImage;
     * textures[TextureCube.FaceIndex.right] = rightImage;
     * textures[TextureCube.FaceIndex.top] = topImage;
     * textures[TextureCube.FaceIndex.bottom] = bottomImage;
     * const textureCube = TextureCube.fromTexture2DArray(textures);
     * ```
     */
    public static fromTexture2DArray (textures: Texture2D[], out?: TextureCube) {
        const mipmaps: ITextureCubeMipmap[] = [];
        const nMipmaps = textures.length / 6;
        for (let i = 0; i < nMipmaps; i++) {
            const x = i * 6;
            mipmaps.push({
                front: textures[x + FaceIndex.front].image!,
                back: textures[x + FaceIndex.back].image!,
                left: textures[x + FaceIndex.left].image!,
                right: textures[x + FaceIndex.right].image!,
                top: textures[x + FaceIndex.top].image!,
                bottom: textures[x + FaceIndex.bottom].image!,
            });
        }
        out = out || new TextureCube();
        out.mipmaps = mipmaps;
        return out;
    }

    @property
    public _mipmaps: ITextureCubeMipmap[] = [];
    private _width: number = 0;
    private _height: number = 0;

    constructor () {
        super();
    }

    public onLoaded () {
        this.mipmaps = this._mipmaps;
        this.loaded = true;
        this.emit('load');
    }

    /**
     * 将当前贴图重置为指定尺寸、像素格式以及指定 mipmap 层级。重置后，贴图的像素数据将变为未定义。
     * mipmap 图像的数据不会自动更新到贴图中，你必须显式调用 `this.uploadData` 来上传贴图数据。
     * @param info 贴图重置选项。
     */
    public reset (info: ITextureCubeCreateInfo) {
        this._width = info.width;
        this._height = info.height;
        this._setGFXFormat(info.format);
        this._setMipmapLevel(info.mipmapLevel || 1);
        this._tryReset();
    }

    public updateMipmaps (firstLevel: number = 0, count?: number) {
        if (firstLevel >= this._mipmaps.length) {
            return;
        }

        const nUpdate = Math.min(
            count === undefined ? this._mipmaps.length : count,
            this._mipmaps.length - firstLevel);

        for (let i = 0; i < nUpdate; ++i) {
            const level = firstLevel + i;
            _forEachFace(this._mipmaps[level], (face, faceIndex) => {
                this._assignImage(face, level, faceIndex);
            });
        }
    }

    /**
     * 销毁此贴图，清空所有 Mipmap 并释放占用的 GPU 资源。
     */
    public destroy () {
        this._mipmaps = [];
        return super.destroy();
    }

    /**
     * 释放占用的 GPU 资源。
     * @deprecated 请转用 `this.destroy()`。
     */
    public releaseTexture () {
        this.mipmaps = [];
    }

    public _serialize (exporting?: any) {
        return {
            base: super._serialize(),
            mipmaps: this._mipmaps.map((mipmap) => exporting ? {
                front: Editor.Utils.UuidUtils.compressUuid(mipmap.front._uuid, true),
                back: Editor.Utils.UuidUtils.compressUuid(mipmap.back._uuid, true),
                left: Editor.Utils.UuidUtils.compressUuid(mipmap.left._uuid, true),
                right: Editor.Utils.UuidUtils.compressUuid(mipmap.right._uuid, true),
                top: Editor.Utils.UuidUtils.compressUuid(mipmap.top._uuid, true),
                bottom: Editor.Utils.UuidUtils.compressUuid(mipmap.bottom._uuid, true),
            } : {
                front: mipmap.front._uuid,
                back: mipmap.back._uuid,
                left: mipmap.left._uuid,
                right: mipmap.right._uuid,
                top: mipmap.top._uuid,
                bottom: mipmap.bottom._uuid,
            }),
        };
    }

    public _deserialize (serializedData: ITextureCubeSerializeData, handle: any) {
        const data = serializedData as ITextureCubeSerializeData;
        super._deserialize(data.base, handle);

        this._mipmaps = new Array(data.mipmaps.length);
        for (let i = 0; i < data.mipmaps.length; ++i) {
            // Prevent resource load failed
            this._mipmaps[i] = {
                front: new ImageAsset(),
                back: new ImageAsset(),
                left: new ImageAsset(),
                right: new ImageAsset(),
                top: new ImageAsset(),
                bottom: new ImageAsset(),
            };
            const mipmap = data.mipmaps[i];
            handle.result.push(this._mipmaps[i], `front`, mipmap.front);
            handle.result.push(this._mipmaps[i], `back`, mipmap.back);
            handle.result.push(this._mipmaps[i], `left`, mipmap.left);
            handle.result.push(this._mipmaps[i], `right`, mipmap.right);
            handle.result.push(this._mipmaps[i], `top`, mipmap.top);
            handle.result.push(this._mipmaps[i], `bottom`, mipmap.bottom);
        }
    }

    protected _getGfxTextureCreateInfo (presumed: PresumedGFXTextureInfo) {
        const result =  Object.assign({
            type: GFXTextureType.TEX2D,
            width: this._width,
            height: this._height,
            arrayLayer: 6,
        }, presumed);
        result.flags = (result.flags || 0) | GFXTextureFlagBit.CUBEMAP;
        return result;
    }

    protected _getGfxTextureViewCreateInfo (presumed: PresumedGFXTextureViewInfo) {
        return Object.assign({
            type: GFXTextureViewType.CUBE,
            layerCount: 6,
        }, presumed);
    }

}

/* tslint:disable:no-string-literal */
cc['TextureCube'] = TextureCube;

interface ITextureCubeSerializeData {
    base: string;
    mipmaps: Array<{
        front: string;
        back: string;
        left: string;
        right: string;
        top: string;
        bottom: string;
    }>;
}

/**
 * @param {Mipmap} mipmap
 * @param {(face: ImageAsset) => void} callback
 */
function _forEachFace (mipmap: ITextureCubeMipmap, callback: (face: ImageAsset, faceIndex: number) => void) {
    callback(mipmap.front, FaceIndex.front);
    callback(mipmap.back, FaceIndex.back);
    callback(mipmap.left, FaceIndex.left);
    callback(mipmap.right, FaceIndex.right);
    callback(mipmap.top, FaceIndex.top);
    callback(mipmap.bottom, FaceIndex.bottom);
}