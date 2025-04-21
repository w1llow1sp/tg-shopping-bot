import { Bot, Context } from 'grammy';
import { CatalogRepository } from './repository';
import { CatalogView } from './view';
import { CallbackDataRoutes } from '../../consts';
import { MessageController } from '../../message';

const catalogRexExp = new RegExp(`^${CallbackDataRoutes.catalog}:(\\d+)$`);
const productRexExp = new RegExp(`^${CallbackDataRoutes.product}:(\\d+)$`);

export class CatalogService {
  private bot: Bot;
  private repository: CatalogRepository;
  private view: CatalogView;
  private productsPerPage: number;
  private messageController: MessageController;


  constructor(
    bot: Bot,
    repository: CatalogRepository,
    messageController: MessageController,
    productsPerPage: number = 4,
  ) {
    console.log('CatalogService initialized with productsPerPage:', productsPerPage);
    this.bot = bot;
    this.repository = repository;
    this.view = new CatalogView(productsPerPage);
    this.productsPerPage = productsPerPage;
    this.messageController = messageController;
    this.registerHandlers();
  }
  private registerHandlers(): void {
    this.bot.callbackQuery(catalogRexExp, this.handleCatalog.bind(this));
    this.bot.callbackQuery(productRexExp, this.handleProduct.bind(this));
  }

  async handleCatalog(ctx: Context): Promise<void> {

    // to be able return back from detail product cart
    //
    await this.messageController.savePreviousCallbackData(ctx)

    const match = ctx.callbackQuery?.data?.match(/^catalog:(\d+)$/);
    const page = match ? Number(match[1]) : 0;
    await this.showCatalog(ctx, page);
  }

  private async showCatalog(ctx: Context, page: number) {
    console.log('Showing catalog for page:', page);
    const offset = page * this.productsPerPage;
    try {
      const [products, totalProducts] = await Promise.all([
        this.repository.getProducts(this.productsPerPage, offset),
        this.repository.getTotalProducts(),
      ]);
      console.log('Products fetched:', products, 'Total:', totalProducts);
      const response = this.view.renderCatalog(products, page, totalProducts);
      console.log('Catalog response:', JSON.stringify(response, null, 2));
      await this.messageController.reply(ctx, response.text, { reply_markup: response.reply_markup });
    } catch (error) {
      console.error('Ошибка в showCatalog:', error);
      await ctx.reply(this.view.renderErrorMessage());
      throw error;
    }
  }
  async handleProduct(ctx: Context): Promise<void> {
    const match = ctx.callbackQuery?.data?.match(/^product:(\d+)$/);
    const productId = match ? Number(match[1]) : 0;
    const product = await this.repository.getProductDetail(productId);
    console.log('Product:', product);
    const response = this.view.renderProduct(product)

    // add previous button
    //
    const prev = await this.messageController.getPreviousCallbackData(ctx)
    if (prev != null) {
      response.reply_markup.text("<< 🥦", prev)
    }

    await this.messageController.reply(ctx, response.text, { reply_markup: response.reply_markup }, true);

    // delete previous callback data
    //
    await this.messageController.delPreviousCallbackData(ctx)
  }
}