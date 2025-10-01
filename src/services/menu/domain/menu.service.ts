/**
 * 🏗️ Menu Service - Domain Logic
 * 
 * Сервис использует репозиторий (доменную логику)
 * Содержит бизнес-логику высокого уровня
 */

import { Bot } from 'grammy';
import { IMenuService, IMenuRepository } from '../ports/menu.port';
import { MenuRepository } from '../adapters/menu.repository';
import { MenuView } from '../adapters/menu.view';
import { BaseService } from '../../../shared/base.service';
import { Logger } from '../../../shared/logger';
import { pool } from '../../../db/pg';

export class MenuService extends BaseService implements IMenuService {
    public readonly name = 'MenuService';
    private menuRepository: IMenuRepository;
    private menuView: MenuView;

    constructor() {
        super();
        this.menuRepository = new MenuRepository(pool);
        this.menuView = new MenuView(this);
    }

    async getMainMenu(): Promise<any> {
        return await this.menuRepository.getMainMenu();
    }

    async getWelcomeMessage(username: string): Promise<any> {
        return await this.menuRepository.getWelcomeMessage(username);
    }

    async checkDatabaseConnection(): Promise<string> {
        return await this.menuRepository.checkDatabaseConnection();
    }



    async getSystemStats(): Promise<any> {
        return await this.menuRepository.getSystemStats();
    }

    protected async registerHandlers(): Promise<void> {
        const bot = this.getBot();
        
        // Регистрируем обработчик команды /start
        bot.command('start', this.handleStartCommand.bind(this));
        
        // Регистрируем обработчики для меню
        bot.callbackQuery('main', this.handleMainMenuCallback.bind(this));
        bot.callbackQuery('menu', this.handleMenuCallback.bind(this));
        bot.callbackQuery('stats', this.handleStatsCallback.bind(this));
        
        this.logger.info('Menu service handlers registered');
    }

    private async handleMainMenuCallback(ctx: any): Promise<void> {
        try {
            this.logger.info('Main menu callback triggered');
            const response = await this.menuView.renderMainMenu();
            
            await ctx.editMessageText(response.text, {
                reply_markup: response.reply_markup,
                parse_mode: 'HTML'
            });
            
            await ctx.answerCallbackQuery();
        } catch (error) {
            this.logger.error('Error handling main menu callback', error as Error);
            await ctx.answerCallbackQuery({
                text: '❌ Ошибка при обработке меню',
                show_alert: true,
            });
        }
    }

    private async handleMenuCallback(ctx: any): Promise<void> {
        try {
            this.logger.info('Menu callback triggered');
            const response = await this.menuView.renderMainMenu();
            
            await ctx.editMessageText(response.text, {
                reply_markup: response.reply_markup,
                parse_mode: 'HTML'
            });
            
            await ctx.answerCallbackQuery();
        } catch (error) {
            this.logger.error('Error handling menu callback', error as Error);
            await ctx.answerCallbackQuery({
                text: '❌ Ошибка при обработке меню',
                show_alert: true,
            });
        }
    }

    private async handleStatsCallback(ctx: any): Promise<void> {
        try {
            this.logger.info('Stats callback triggered');
            const response = await this.menuView.renderSystemStats();
            
            await ctx.editMessageText(response.text, {
                reply_markup: response.reply_markup,
                parse_mode: 'HTML'
            });
            
            await ctx.answerCallbackQuery();
        } catch (error) {
            this.logger.error('Error handling stats callback', error as Error);
            await ctx.answerCallbackQuery({
                text: '❌ Ошибка при обработке статистики',
                show_alert: true,
            });
        }
    }

    private async handleStartCommand(ctx: any): Promise<void> {
        try {
            this.logger.info('Start command triggered');
            const username = ctx.from?.username || ctx.from?.first_name || 'Пользователь';
            const response = await this.menuView.renderWelcomeMessage(username);
            
            await ctx.reply(response.text, {
                reply_markup: response.reply_markup,
                parse_mode: 'HTML'
            });
        } catch (error) {
            this.logger.error('Error handling start command', error as Error);
            await ctx.reply('❌ Ошибка при запуске бота. Попробуйте позже.');
        }
    }


} 