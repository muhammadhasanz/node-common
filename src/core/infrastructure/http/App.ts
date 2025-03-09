import compression from 'compression';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import 'express-async-errors';

import { Container } from '@/core/infrastructure/Container';
import { Controller } from '@/core/infrastructure/Controller';
import { loggerMiddleware } from '@/core/infrastructure/http/middleware/loggerMiddleware';
import { routeNotFoundMiddleware } from '@/core/infrastructure/http/middleware/routeNotFoundMiddleware';
import { errorMiddleware } from '@/core/infrastructure/http/middleware/errorMiddleware';
import { alwaysAcceptJsonMiddleware } from '@/core/infrastructure/http/middleware/alwaysAcceptJsonMiddleware';
import HealthController from '@/core/modules/health/useCases/health/HealthController';
import DetailController from '@/core/modules/service/useCases/detail/DetailController';

export class App {
  protected app: express.Application = express();
  protected controllers: any[] = [];

  constructor(controllers: any[], options: any = {}) {
    this.registerMiddleware();
    this.registerHealthHandlers(options.health);
    this.registerDetailControllers();
    this.registerControllers([...this.controllers, ...controllers]);
    this.registerErrorHandlers();
  }

  public start() {
    this.app.listen(3000, () => {
      console.info('App listening @', 3000);
    });

    return this.app;
  }

  protected registerMiddleware() {
    this.app.disable('x-powered-by');
    this.app.use(loggerMiddleware);
    this.app.use(alwaysAcceptJsonMiddleware);

    this.app.use(cors({ origin: '*' }));
    // this.app.use(compression());
    this.app.use(helmet());
    this.app.use(express.json({ limit: '2048mb' }));
    this.app.use(express.urlencoded({ limit: '2048mb', extended: true }));
  }

  protected registerControllers(controllers: any[]) {
    controllers.forEach((controller) => {
      const instance = this.resolve(controller);
      this.app.use('/', instance.router);
    });
  }

  protected resolve(klass: any): Controller {
    if (klass instanceof Controller) {
      return klass;
    }
    return Container.get<Controller>(klass);
  }

  protected registerHealthHandlers(health: any) {
    Container.set('health', health);
    if (!Container.has('HealthController')) {
      this.controllers.push(HealthController);
      return;
    }
    const healthController = Container.get('HealthController');
    this.controllers.push(healthController);
  }

  protected registerDetailControllers() {
    this.controllers.push(DetailController);
  }

  protected registerErrorHandlers() {
    this.app.use(routeNotFoundMiddleware);
    this.app.use(errorMiddleware);
  }
}
