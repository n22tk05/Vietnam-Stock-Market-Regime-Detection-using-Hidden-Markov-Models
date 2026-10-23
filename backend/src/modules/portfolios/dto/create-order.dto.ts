import { IsString, IsNotEmpty, IsIn, IsNumber, IsPositive, IsOptional } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  symbol: string;

  @IsIn(['BUY', 'SELL'])
  action: 'BUY' | 'SELL';

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsNumber()
  @IsPositive()
  price: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  orderDate?: string;
}
