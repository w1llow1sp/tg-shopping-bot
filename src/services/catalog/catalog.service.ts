import { Bot, Context, InlineKeyboard } from 'grammy';
import { CatalogRepository } from './catalog.repository';
import { CatalogView } from './catalog.view';
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
    console.log(
      'CatalogService initialized with productsPerPage:',
      productsPerPage,
    );
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

  // Новый метод для доступа к CatalogView
  getView(): CatalogView {
    return this.view;
  }

  async handleCatalog(ctx: Context): Promise<void> {
    await this.messageController.savePreviousCallbackData(ctx);
    const match = ctx.callbackQuery?.data?.match(/^catalog:(\d+)$/);
    const page = match ? Number(match[1]) : 0;

    console.log('Handling catalog for page:', page);
    const offset = page * this.productsPerPage;
    try {
      const [products, totalProducts] = await Promise.all([
        this.repository.getProducts(this.productsPerPage, offset),
        this.repository.getTotalProducts(),
      ]);
      console.log('Products fetched:', products, 'Total:', totalProducts);
      const response = this.view.renderCatalog(products, page, totalProducts);
      console.log('Catalog response:', JSON.stringify(response, null, 2));
      const textResponse = response as { text: string; reply_markup: InlineKeyboard };

      const message = ctx.callbackQuery?.message;
      if (message) {
        try {
          console.log('Editing catalog message');
          await ctx.editMessageText(textResponse.text, {
            reply_markup: textResponse.reply_markup,
            parse_mode: 'HTML',
          });
        } catch (editError) {
          console.warn('Failed to edit catalog message, sending new one:', editError);
          try {
            await ctx.deleteMessage();
          } catch (deleteError) {
            console.warn('Failed to delete message:', deleteError);
          }
          await this.messageController.reply(ctx, textResponse.text, {
            reply_markup: textResponse.reply_markup,
            parse_mode: 'HTML',
          });
        }
      } else {
        console.log('No message to edit, sending new catalog response');
        await this.messageController.reply(ctx, textResponse.text, {
          reply_markup: textResponse.reply_markup,
          parse_mode: 'HTML',
        });
      }

      await ctx.answerCallbackQuery();
    } catch (error) {
      console.error('Ошибка в handleCatalog:', error);
      await ctx.answerCallbackQuery({
        text: '❌ Ошибка при загрузке каталога',
        show_alert: true,
      });
    }
  }

  async handleProduct(ctx: Context): Promise<void> {
    try {
      const match = ctx.callbackQuery?.data?.match(/^product:(\d+)$/);
      const productId = match ? Number(match[1]) : 0;
      console.log('Handling product with ID:', productId);
      if (!productId) {
        console.log('Invalid product ID');
        await ctx.answerCallbackQuery({
          text: '❌ Неверный ID продукта',
          show_alert: true,
        });
        return;
      }

      const [product, neighbors] = await Promise.all([
        this.repository.getProductDetail(productId),
        this.repository.getNeighborProducts(productId),
      ]);
      console.log('Fetched product:', product, 'Neighbors:', neighbors);

      const prevCallback = await this.messageController.getPreviousCallbackData(ctx);
      console.log('Previous callback data:', prevCallback);

      const backCallback: string | undefined = prevCallback ?? undefined;

      const response = this.view.renderProduct(
        product,
        neighbors.prevId,
        neighbors.nextId,
        backCallback,
      );
      console.log('Render product response:', response);

      const message = ctx.callbackQuery?.message;
      if (message) {
        try {
          if ('photo' in response) {
            console.log('Editing photo message');
            await ctx.editMessageMedia(
              {
                type: 'photo',
                media: response.photo,
                caption: response.caption,
                parse_mode: 'HTML',
              },
              { reply_markup: response.reply_markup },
            );
          } else {
            console.log('Editing text message');
            await ctx.editMessageText(response.text, {
              reply_markup: response.reply_markup,
              parse_mode: 'HTML',
            });
          }
        } catch (editError) {
          console.warn('Failed to edit message:', editError);
          try {
            await ctx.deleteMessage();
          } catch (deleteError) {
            console.warn('Failed to delete message:', deleteError);
          }
          if ('photo' in response) {
            console.log('Sending new photo response');
            try {
              await ctx.replyWithPhoto(response.photo, {
                caption: response.caption,
                reply_markup: response.reply_markup,
                parse_mode: 'HTML',
              });
            } catch (photoError) {
              console.warn('Failed to send photo, sending text-only:', photoError);
              await this.messageController.reply(
                ctx,
                response.caption,
                {
                  reply_markup: response.reply_markup,
                  parse_mode: 'HTML',
                },
                true,
              );
            }
          } else {
            console.log('Sending new text response');
            await this.messageController.reply(
              ctx,
              response.text,
              {
                reply_markup: response.reply_markup,
                parse_mode: 'HTML',
              },
              true,
            );
          }
        }
      } else {
        if ('photo' in response) {
          console.log('Sending new photo response');
          try {
            await ctx.replyWithPhoto(response.photo, {
              caption: response.caption,
              reply_markup: response.reply_markup,
              parse_mode: 'HTML',
            });
          } catch (photoError) {
            console.warn('Failed to send photo, sending text-only:', photoError);
            await this.messageController.reply(
              ctx,
              response.caption,
              {
                reply_markup: response.reply_markup,
                parse_mode: 'HTML',
              },
              true,
            );
          }
        } else {
          console.log('Sending new text response');
          await this.messageController.reply(
            ctx,
            response.text,
            {
              reply_markup: response.reply_markup,
              parse_mode: 'HTML',
            },
            true,
          );
        }
      }

      await this.messageController.delPreviousCallbackData(ctx);
      await ctx.answerCallbackQuery();
    } catch (error) {
      console.error('Ошибка в handleProduct:', error);
      await ctx.answerCallbackQuery({
        text: '❌ Ошибка при загрузке продукта',
        show_alert: true,
      });
    }
  }
}