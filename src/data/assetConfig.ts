import type { BuildingType } from '../domain/types';

/** 只登记已取得的真实文件，缺失类型不发起请求；来源另见 docs/ASSET_RECORD.md。 */
export const ASSET_FILES: Partial<Record<BuildingType, string>> = { factory: 'factory.glb', house: 'house.glb', shop: 'shop.glb' };

/** 显示尺寸上限独立于逻辑占地，避免换模型后改变拾取和经济规则。 */
export const MODEL_HEIGHT: Record<BuildingType, number> = { factory: 1.5, house: 1, park: 0.8, shop: 0.8 };
