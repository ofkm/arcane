package services

import (
	"context"
	"os"
	"path/filepath"
	"testing"

	glsqlite "github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"

	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/models"
)

func setupProjectTestDB(t *testing.T) *database.DB {
	t.Helper()
	db, err := gorm.Open(glsqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&models.Project{}, &models.SettingVariable{}))
	return &database.DB{DB: db}
}

func setupProjectTestEnv(t *testing.T, db *database.DB) (*ProjectService, string) {
	t.Helper()

	// Create temp directory for projects
	tempDir := t.TempDir()

	// Setup settings service with the temp directory
	ctx := context.Background()
	settingsService, err := NewSettingsService(ctx, db)
	require.NoError(t, err)
	require.NoError(t, settingsService.EnsureDefaultSettings(ctx))

	// Set the projects directory to our temp dir
	require.NoError(t, settingsService.UpdateSetting(ctx, "projectsDirectory", tempDir))

	// Create project service (without actual Docker/event services for this test)
	projectService := NewProjectService(db, settingsService, nil, nil)

	return projectService, tempDir
}

func createProjectDir(t *testing.T, baseDir, projectPath string) {
	t.Helper()
	fullPath := filepath.Join(baseDir, projectPath)
	require.NoError(t, os.MkdirAll(fullPath, 0755))

	// Create a compose file
	composeContent := `services:
  web:
    image: nginx:latest
`
	composePath := filepath.Join(fullPath, "compose.yaml")
	require.NoError(t, os.WriteFile(composePath, []byte(composeContent), 0644))
}

func TestProjectService_SyncProjectsFromFileSystem_FlatStructure(t *testing.T) {
	db := setupProjectTestDB(t)
	projectService, tempDir := setupProjectTestEnv(t, db)
	ctx := context.Background()

	// Create flat project structure
	createProjectDir(t, tempDir, "project1")
	createProjectDir(t, tempDir, "project2")
	createProjectDir(t, tempDir, "project3")

	// Run sync
	err := projectService.SyncProjectsFromFileSystem(ctx)
	require.NoError(t, err)

	// Verify all projects were found
	projects, err := projectService.ListAllProjects(ctx)
	require.NoError(t, err)
	require.Len(t, projects, 3, "Expected 3 projects to be synced")

	// Verify project names
	projectNames := make(map[string]bool)
	for _, p := range projects {
		projectNames[p.Name] = true
	}
	require.True(t, projectNames["project1"])
	require.True(t, projectNames["project2"])
	require.True(t, projectNames["project3"])
}

func TestProjectService_SyncProjectsFromFileSystem_NestedStructure(t *testing.T) {
	db := setupProjectTestDB(t)
	projectService, tempDir := setupProjectTestEnv(t, db)
	ctx := context.Background()

	// Create nested project structure
	createProjectDir(t, tempDir, "production/app1")
	createProjectDir(t, tempDir, "production/app2")
	createProjectDir(t, tempDir, "staging/app1")
	createProjectDir(t, tempDir, "development/test-app")

	// Run sync
	err := projectService.SyncProjectsFromFileSystem(ctx)
	require.NoError(t, err)

	// Verify all projects were found
	projects, err := projectService.ListAllProjects(ctx)
	require.NoError(t, err)
	require.Len(t, projects, 4, "Expected 4 nested projects to be synced")

	// Verify project paths contain the nested structure
	var found int
	for _, p := range projects {
		if filepath.Dir(p.Path) == filepath.Join(tempDir, "production") {
			found++
		}
		if filepath.Dir(p.Path) == filepath.Join(tempDir, "staging") {
			found++
		}
		if filepath.Dir(p.Path) == filepath.Join(tempDir, "development") {
			found++
		}
	}
	require.Equal(t, 4, found, "All nested projects should maintain their directory structure")
}

func TestProjectService_SyncProjectsFromFileSystem_MixedStructure(t *testing.T) {
	db := setupProjectTestDB(t)
	projectService, tempDir := setupProjectTestEnv(t, db)
	ctx := context.Background()

	// Create mixed structure: some flat, some nested
	createProjectDir(t, tempDir, "flat-project")
	createProjectDir(t, tempDir, "category/nested-project")
	createProjectDir(t, tempDir, "another-flat")

	// Run sync
	err := projectService.SyncProjectsFromFileSystem(ctx)
	require.NoError(t, err)

	// Verify all projects were found
	projects, err := projectService.ListAllProjects(ctx)
	require.NoError(t, err)
	require.Len(t, projects, 3, "Expected 3 projects in mixed structure")
}

func TestProjectService_SyncProjectsFromFileSystem_CleanupMissing(t *testing.T) {
	db := setupProjectTestDB(t)
	projectService, tempDir := setupProjectTestEnv(t, db)
	ctx := context.Background()

	// Create a project
	createProjectDir(t, tempDir, "existing-project")

	// Run initial sync
	err := projectService.SyncProjectsFromFileSystem(ctx)
	require.NoError(t, err)

	projects, err := projectService.ListAllProjects(ctx)
	require.NoError(t, err)
	require.Len(t, projects, 1)

	// Manually add a project to DB with a non-existent path
	ghostProject := &models.Project{
		Name:    "ghost-project",
		DirName: stringPtr("ghost-project"),
		Path:    filepath.Join(tempDir, "non-existent"),
		Status:  models.ProjectStatusStopped,
	}
	require.NoError(t, db.Create(ghostProject).Error)

	// Verify it's in the DB
	projects, err = projectService.ListAllProjects(ctx)
	require.NoError(t, err)
	require.Len(t, projects, 2)

	// Run sync again - should cleanup the ghost project
	err = projectService.SyncProjectsFromFileSystem(ctx)
	require.NoError(t, err)

	// Verify ghost project was removed
	projects, err = projectService.ListAllProjects(ctx)
	require.NoError(t, err)
	require.Len(t, projects, 1)
	require.Equal(t, "existing-project", projects[0].Name)
}

func TestProjectService_SyncProjectsFromFileSystem_DoesNotDescendIntoProjects(t *testing.T) {
	db := setupProjectTestDB(t)
	projectService, tempDir := setupProjectTestEnv(t, db)
	ctx := context.Background()

	// Create a project with a nested compose file (should not be treated as separate project)
	createProjectDir(t, tempDir, "parent-project")
	createProjectDir(t, tempDir, "parent-project/nested")

	// Run sync
	err := projectService.SyncProjectsFromFileSystem(ctx)
	require.NoError(t, err)

	// Should only find the parent project, not the nested one
	projects, err := projectService.ListAllProjects(ctx)
	require.NoError(t, err)
	require.Len(t, projects, 1, "Should only find parent project, not nested compose files")
	require.Equal(t, "parent-project", projects[0].Name)
}

func stringPtr(s string) *string {
	return &s
}
