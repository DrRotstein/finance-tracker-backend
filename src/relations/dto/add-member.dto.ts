import { IsEnum, IsUUID } from 'class-validator';
import { MemberRole } from '../../entities/transaction-relation-member.entity';

export class AddMemberDto {
  @IsUUID()
  transactionId: string;

  @IsEnum(MemberRole)
  role: MemberRole;
}
