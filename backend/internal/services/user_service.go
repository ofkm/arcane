package services

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"log"
	"math/big"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"github.com/google/uuid"
	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/models"
)

type UserService struct {
	db *database.DB
}

func NewUserService(db *database.DB) *UserService {
	return &UserService{db: db}
}

func (s *UserService) CreateUser(ctx context.Context, user *models.User) (*models.User, error) {
	if err := s.db.WithContext(ctx).Create(user).Error; err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}
	return user, nil
}

func (s *UserService) CreateUserWithPassword(username, password, email, role string, displayName string) (*models.User, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	user := &models.User{
		ID:           uuid.New().String(),
		Username:     username,
		Email:        &email,
		DisplayName:  &displayName,
		PasswordHash: string(hashedPassword),
		Roles:        models.StringSlice{role},
	}

	if err := s.db.Create(user).Error; err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return user, nil
}

func (s *UserService) GetUserByUsername(ctx context.Context, username string) (*models.User, error) {
	var user models.User
	if err := s.db.WithContext(ctx).Where("username = ?", username).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	return &user, nil
}

func (s *UserService) GetUserByID(ctx context.Context, id string) (*models.User, error) {
	var user models.User
	if err := s.db.WithContext(ctx).Where("id = ?", id).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	return &user, nil
}

func (s *UserService) GetUserById(ctx context.Context, id string) (*models.User, error) {
	return s.GetUserByID(ctx, id)
}

func (s *UserService) GetUserByOidcSubjectId(ctx context.Context, subjectId string) (*models.User, error) {
	var user models.User
	if err := s.db.WithContext(ctx).Where("oidc_subject_id = ?", subjectId).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}
	return &user, nil
}

func (s *UserService) UpdateUser(ctx context.Context, user *models.User) (*models.User, error) {
	if err := s.db.WithContext(ctx).Save(user).Error; err != nil {
		return nil, fmt.Errorf("failed to update user: %w", err)
	}
	return user, nil
}

func (s *UserService) CountUsers() (int64, error) {
	var count int64
	if err := s.db.Model(&models.User{}).Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

func (s *UserService) ValidatePassword(hashedPassword, password string) error {
	return bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
}

func (s *UserService) CreateDefaultAdmin() error {
	count, err := s.CountUsers()
	if err != nil {
		return fmt.Errorf("failed to count users: %w", err)
	}

	if count > 0 {
		log.Printf("👤 Users already exist, skipping default admin creation")
		return nil
	}

	_, err = s.CreateUserWithPassword("arcane", "arcane-admin", "admin@localhost", "admin", "Arcane Admin")
	if err != nil {
		return fmt.Errorf("failed to create default admin user: %w", err)
	}

	log.Printf("👑 Default admin user created!")
	log.Printf("🔑 Username: admin")
	log.Printf("⚠️  Please change this password after first login!")

	return nil
}

func (s *UserService) generateRandomPassword(length int) (string, error) {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
	password := make([]byte, length)

	for i := range password {
		num, err := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		if err != nil {
			return "", err
		}
		password[i] = charset[num.Int64()]
	}

	return string(password), nil
}

func (s *UserService) ListUsers(ctx context.Context) ([]models.User, error) {
	var users []models.User
	if err := s.db.WithContext(ctx).Find(&users).Error; err != nil {
		return nil, fmt.Errorf("failed to list users: %w", err)
	}
	return users, nil
}

func (s *UserService) DeleteUser(ctx context.Context, id string) error {
	if err := s.db.WithContext(ctx).Delete(&models.User{}, "id = ?", id).Error; err != nil {
		return fmt.Errorf("failed to delete user: %w", err)
	}
	return nil
}
