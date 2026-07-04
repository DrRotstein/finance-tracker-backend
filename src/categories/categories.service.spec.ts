import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { Category } from '../entities/category.entity';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let categoryRepo: any;

  const mockCategory: Category = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Groceries',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    categoryRepo = {
      find: jest.fn().mockResolvedValue([mockCategory]),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: getRepositoryToken(Category), useValue: categoryRepo },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  describe('findAll', () => {
    it('should return all categories ordered by name', async () => {
      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Groceries');
      expect(categoryRepo.find).toHaveBeenCalledWith({
        order: { name: 'ASC' },
        select: ['id', 'name'],
      });
    });
  });

  describe('findOne', () => {
    it('should return a category by id', async () => {
      categoryRepo.findOne.mockResolvedValue(mockCategory);
      const result = await service.findOne(mockCategory.id);
      expect(result.id).toBe(mockCategory.id);
    });

    it('should throw NotFoundException for non-existent id', async () => {
      categoryRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a category', async () => {
      categoryRepo.findOne.mockResolvedValue(null);
      categoryRepo.create.mockReturnValue(mockCategory);
      categoryRepo.save.mockResolvedValue(mockCategory);

      const result = await service.create({ name: 'Groceries' });
      expect(result.name).toBe('Groceries');
    });

    it('should throw ConflictException if name already exists', async () => {
      categoryRepo.findOne.mockResolvedValue(mockCategory);

      await expect(service.create({ name: 'Groceries' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('update', () => {
    it('should update category name', async () => {
      categoryRepo.findOne
        .mockResolvedValueOnce(mockCategory) // find by id
        .mockResolvedValueOnce(null); // no duplicate
      categoryRepo.save.mockResolvedValue({ ...mockCategory, name: 'Food' });

      const result = await service.update(mockCategory.id, { name: 'Food' });
      expect(result.name).toBe('Food');
    });

    it('should throw NotFoundException for non-existent id', async () => {
      categoryRepo.findOne.mockResolvedValue(null);
      await expect(
        service.update('non-existent', { name: 'Food' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if new name already taken', async () => {
      const existingOther = { ...mockCategory, id: 'other-id', name: 'Food' };
      categoryRepo.findOne
        .mockResolvedValueOnce(mockCategory) // find by id
        .mockResolvedValueOnce(existingOther); // duplicate found

      await expect(
        service.update(mockCategory.id, { name: 'Food' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should not check duplicate if name is unchanged', async () => {
      categoryRepo.findOne.mockResolvedValue(mockCategory);
      categoryRepo.save.mockResolvedValue(mockCategory);

      const result = await service.update(mockCategory.id, {
        name: 'Groceries',
      });
      expect(result.name).toBe('Groceries');
      // findOne called only once (for finding by id)
      expect(categoryRepo.findOne).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove', () => {
    it('should delete a category', async () => {
      categoryRepo.findOne.mockResolvedValue(mockCategory);
      categoryRepo.remove.mockResolvedValue(mockCategory);

      await service.remove(mockCategory.id);
      expect(categoryRepo.remove).toHaveBeenCalledWith(mockCategory);
    });

    it('should throw NotFoundException for non-existent id', async () => {
      categoryRepo.findOne.mockResolvedValue(null);
      await expect(service.remove('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
