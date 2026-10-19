import dataSource from '../../database/dataSource.js';
import { Role } from '../../database/entities.js';

export const listRoles = async (): Promise<Role[]> => dataSource
  .getRepository(Role)
  .find({
    select: {
      id: true,
      code: true,
      name: true,
    },
    order: {
      code: 'ASC',
    },
  });
