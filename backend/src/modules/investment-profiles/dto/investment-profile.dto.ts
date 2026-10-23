import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';

export enum RiskAppetite {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum InvestmentHorizon {
  SHORT_TERM = 'SHORT_TERM',
  MEDIUM_TERM = 'MEDIUM_TERM',
  LONG_TERM = 'LONG_TERM',
}

export class CreateInvestmentProfileDto {
  @IsNumber({}, { message: 'Vốn đầu tư phải là số' })
  @Min(1000000, { message: 'Vốn đầu tư tối thiểu là 1.000.000 VNĐ' })
  capital: number;

  @IsEnum(RiskAppetite, { message: 'Khẩu vị rủi ro phải là LOW, MEDIUM hoặc HIGH' })
  riskAppetite: RiskAppetite;

  @IsEnum(InvestmentHorizon, { message: 'Thời hạn đầu tư phải là SHORT_TERM, MEDIUM_TERM hoặc LONG_TERM' })
  investmentHorizon: InvestmentHorizon;

  @IsOptional()
  @IsNumber()
  expectedReturn?: number;

  @IsOptional()
  @IsNumber()
  maximumDrawdown?: number;
}

export class UpdateInvestmentProfileDto {
  @IsOptional()
  @IsNumber()
  @Min(1000000, { message: 'Vốn đầu tư tối thiểu là 1.000.000 VNĐ' })
  capital?: number;

  @IsOptional()
  @IsEnum(RiskAppetite)
  riskAppetite?: RiskAppetite;

  @IsOptional()
  @IsEnum(InvestmentHorizon)
  investmentHorizon?: InvestmentHorizon;

  @IsOptional()
  @IsNumber()
  expectedReturn?: number;

  @IsOptional()
  @IsNumber()
  maximumDrawdown?: number;
}
