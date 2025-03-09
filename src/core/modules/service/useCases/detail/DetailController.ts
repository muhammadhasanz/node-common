import { Request, Response } from 'express';
import { Container, Service } from '@/core/infrastructure/Container';
import { Controller } from '@/core/infrastructure/Controller';

@Service()
export default class DetailController extends Controller {

  registerRoutes(): void {
    this.router.get('/', this.show.bind(this));
  }

  async show(req: Request, res: Response) {
    const config = Container.get<any>('config');

    const name = process.env.npm_package_name ?? config.app.name;
    const version = process.env.npm_package_version ?? config.app.version;

    return this.ok(res, { name, version });
  }
}
