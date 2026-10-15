import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Req,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  CartService,
  BillingCycle,
} from '@cloudfly/domain';

export class CreateCartDto {
  planCode!: string;
  billingCycle!: BillingCycle;
  currency!: string;
  extras?: Record<string, any>;
}

export class UpdateCartDto {
  billingCycle?: BillingCycle;
  quantity?: number;
  extras?: Record<string, any>;
}

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post()
  async createCart(@Body() dto: CreateCartDto) {
    try {
      return await this.cartService.createCart({
        planCode: dto.planCode,
        billingCycle: dto.billingCycle,
        currency: dto.currency,
        extras: dto.extras,
      });
    } catch (err: any) {
      throw new BadRequestException(err.message);
    }
  }

  @Get(':cartId')
  async getCart(@Param('cartId') cartId: string) {
    try {
      return await this.cartService.getCart(cartId);
    } catch (err: any) {
      if (err.message.includes('not found') || err.message.includes('expired')) {
        throw new NotFoundException(err.message);
      }
      throw new BadRequestException(err.message);
    }
  }

  @Patch(':cartId')
  async updateCart(
    @Param('cartId') cartId: string,
    @Body() dto: UpdateCartDto
  ) {
    try {
      return await this.cartService.updateCart(cartId, {
        billingCycle: dto.billingCycle,
        quantity: dto.quantity,
        extras: dto.extras,
      });
    } catch (err: any) {
      if (err.message.includes('not found')) {
        throw new NotFoundException(err.message);
      }
      throw new BadRequestException(err.message);
    }
  }

  @Post(':cartId/claim')
  async claimCart(@Param('cartId') cartId: string, @Req() req: any) {
    const userId = req.user?.userId || req.body?.userId;
    const organizationId = req.user?.organizationId || req.body?.organizationId;

    if (!userId || !organizationId) {
      throw new BadRequestException('userId and organizationId are required to claim a cart.');
    }

    try {
      return await this.cartService.claimCart(cartId, userId, organizationId);
    } catch (err: any) {
      if (err.message.includes('not found')) {
        throw new NotFoundException(err.message);
      }
      throw new BadRequestException(err.message);
    }
  }
}
