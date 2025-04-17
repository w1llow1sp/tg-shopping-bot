import { Bot, Context } from 'grammy';
import { CatalogModel } from './model';
import { CatalogView } from './view';
import { Pool } from 'pg';

export class CatalogController {
  private bot: Bot;
  private model: CatalogModel;
  private view: CatalogView;
  private productsPerPage: number;

  constructor(bot: Bot, db: Pool, productsPerPage: number = 4) {
    console.log('CatalogController initialized with productsPerPage:', productsPerPage);
    this.bot = bot;
    this.model = new CatalogModel();
    this.view = new CatalogView(productsPerPage);
    this.productsPerPage = productsPerPage;
  }

  async handleCallback(ctx: Context) {
    if (!ctx.callbackQuery) {
      console.error('Callback query is undefined in CatalogController');
      return;
    }
    const callbackData = ctx.callbackQuery.data;
    console.log('CatalogController processing callback:', callbackData);

    try {
      if (callbackData === 'catalog') {
        await this.showCatalog(ctx, 0);
      } else if (callbackData?.startsWith('catalog_next_')) {
        const page = parseInt(callbackData.split('_')[2], 10);
        await this.showCatalog(ctx, page);
      } else if (callbackData?.startsWith('catalog_prev_')) {
        const page = parseInt(callbackData.split('_')[2], 10);
        await this.showCatalog(ctx, page);
      } else if (callbackData?.startsWith('product_')) {
        const productId = parseInt(callbackData.split('_')[1], 10);
        await ctx.reply(this.view.renderProductPlaceholder(productId));
      }
    } catch (error) {
      console.error('Ошибка обработки catalog callback:', error);
      await ctx.reply(this.view.renderErrorMessage());
      throw error;
    }
  }

  private async showCatalog(ctx: Context, page: number) {
    console.log('Showing catalog for page:', page);
    const offset = page * this.productsPerPage;
    try {
      const [products, totalProducts] = await Promise.all([
        this.model.getProducts(this.productsPerPage, offset),
        this.model.getTotalProducts(),
      ]);
      console.log('Products fetched:', products, 'Total:', totalProducts);
      const response = this.view.renderCatalog(products, page, totalProducts);
      console.log('Catalog response:', JSON.stringify(response, null, 2));
      await ctx.reply(response.text, { reply_markup: response.reply_markup });
    } catch (error) {
      console.error('Ошибка в showCatalog:', error);
      await ctx.reply(this.view.renderErrorMessage());
      throw error;
    }
  }
}