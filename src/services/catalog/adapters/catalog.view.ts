/**
 * 🎨 Catalog View Adapter
 * 
 * View использует только сервис
 * Реализация порта ICatalogView для отображения каталога в Telegram
 */

import { InlineKeyboard } from 'grammy';
import { ICatalogView, Product, ICatalogService } from '../ports/catalog.port';
import { CatalogItem } from './catalog.item';

export type CatalogResponse =
  | { text: string; reply_markup: InlineKeyboard }
  | { photo: string; caption: string; reply_markup: InlineKeyboard };

export class CatalogView implements ICatalogView {
    private readonly catalogService: ICatalogService;
    private static readonly PLACEHOLDER_IMAGE_URL = 'https://upload.wikimedia.org/wikipedia/commons/9/9a/%D0%9D%D0%B5%D1%82_%D1%84%D0%BE%D1%82%D0%BE.png';
    private productsPerPage: number;
    private catalogItem: CatalogItem;

    constructor(catalogService: ICatalogService, productsPerPage: number = 4) {
        this.catalogService = catalogService;
        this.productsPerPage = productsPerPage;
        this.catalogItem = new CatalogItem();
    }

    /**
     * Отобразить каталог товаров
     */
    async renderCatalog(products: Product[], page: number, total: number, productsPerPage: number): Promise<any> {
        const currentPage = page - 1; // Конвертируем в 0-based индекс
        const pageText = `страница ${currentPage + 1}`;
        const text = products.length
            ? `<b>🥦 Каталог товаров (${pageText}):</b>`
            : 'Каталог пуст :(';

        const keyboard = new InlineKeyboard();

        products.forEach((product) => {
            const productName = product.name;
            keyboard
                .text(
                    `${productName} (${product.price.toString()}) ₽`,
                    `product:${product.id}`
                )
                .row();
        });

        keyboard
            .text('Корзина', 'cart')
            .text('Главная', 'main')
            .row();

        const totalPages = Math.ceil(total / this.productsPerPage);
        if (totalPages > 1) {
            if (currentPage === 0) {
                keyboard.text('>>', `catalog:${currentPage + 2}`);
            } else if (currentPage === totalPages - 1) {
                keyboard.text('<<', `catalog:${currentPage}`);
            } else {
                keyboard
                    .text('<<', `catalog:${currentPage}`)
                    .text('>>', `catalog:${currentPage + 2}`);
            }
        }

        return { text, reply_markup: keyboard };
    }

    /**
     * Отобразить детальную информацию о товаре
     */
    renderProduct(product: Product, neighbors: { prevId: number | null; nextId: number | null }, isAdded: boolean = false): any {
        console.log('CatalogView.renderProduct called with:', {
            productId: product.id,
            productName: product.name,
            itemsavailable: product.itemsavailable,
            neighbors,
            isAdded
        });
        
        // Проверяем, что neighbors имеет правильную структуру
        console.log('Neighbors structure:', {
            prevId: neighbors?.prevId,
            nextId: neighbors?.nextId,
            hasPrev: !!neighbors?.prevId,
            hasNext: !!neighbors?.nextId
        });
        
        const result = this.catalogItem.renderProduct(
            product,
            neighbors?.prevId || null,
            neighbors?.nextId || null,
            'catalog:1',
            isAdded
        );
        
        console.log('CatalogView.renderProduct result:', result);
        console.log('Result has reply_markup:', !!result.reply_markup);
        console.log('Reply markup structure:', result.reply_markup?.inline_keyboard);
        return result;
    }

    /**
     * Отобразить сообщение об ошибке
     */
    renderError(message: string): any {
        return {
            text: `❌ Ошибка каталога: ${message}\n\nПопробуйте еще раз или обратитесь к администратору.`,
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '📋 Каталог', callback_data: 'catalog:1' },
                        { text: '🏠 Главная', callback_data: 'main' }
                    ]
                ]
            }
        };
    }

    /**
     * Отобразить сообщение об ошибке (для совместимости со старым кодом)
     */
    renderErrorMessage(): string {
        return 'Произошла ошибка при загрузке каталога. Попробуйте позже.';
    }

    /**
     * Отобразить каталог для пользователя (использует сервис)
     */
    async renderCatalogForUser(page: number, productsPerPage: number = 4): Promise<any> {
        try {
            const catalogData = await this.catalogService.getCatalogPage(page, productsPerPage);
            return await this.renderCatalog(
                catalogData.products,
                catalogData.page,
                catalogData.total,
                catalogData.productsPerPage
            );
        } catch (error) {
            return this.renderError('Не удалось загрузить каталог');
        }
    }

    /**
     * Отобразить товар для пользователя (использует сервис)
     */
    async renderProductForUser(productId: number): Promise<any> {
        try {
            const [product, neighbors] = await Promise.all([
                this.catalogService.getProductDetail(productId),
                this.catalogService.getNeighborProducts(productId),
            ]);
            return await this.renderProduct(product, neighbors);
        } catch (error) {
            return this.renderError('Не удалось загрузить информацию о товаре');
        }
    }

    /**
     * Отобразить поиск товаров
     */
    async renderSearchResults(searchTerm: string, page: number, productsPerPage: number = 4): Promise<any> {
        try {
            const searchData = await this.catalogService.searchProductsWithPagination(searchTerm, page, productsPerPage);
            
            if (searchData.products.length === 0) {
                return {
                    text: `🔍 Результаты поиска: "${searchTerm}"\n\n❌ Товары не найдены.\n\nПопробуйте изменить поисковый запрос.`,
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: '📋 Каталог', callback_data: 'catalog:1' },
                                { text: '🏠 Главная', callback_data: 'main' }
                            ]
                        ]
                    }
                };
            }

            return await this.renderCatalog(
                searchData.products,
                searchData.page,
                searchData.total,
                searchData.productsPerPage
            );
        } catch (error) {
            return this.renderError('Не удалось выполнить поиск');
        }
    }
} 