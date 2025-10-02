package projects

import (
	"context"
	"io"

	"github.com/compose-spec/compose-go/v2/types"
	"github.com/docker/compose/v2/pkg/api"
)

func ComposeRestart(ctx context.Context, proj *types.Project, services []string) error {
	c, err := NewClient(ctx)
	if err != nil {
		return err
	}
	defer c.Close()
	return c.svc.Restart(ctx, proj.Name, api.RestartOptions{Services: services})
}

func ComposeUp(ctx context.Context, proj *types.Project, services []string) error {
	c, err := NewClient(ctx)
	if err != nil {
		return err
	}
	defer c.Close()

	upOptions := api.CreateOptions{
		Services:  proj.ServiceNames(),
		AssumeYes: true,
	}
	startOptions := api.StartOptions{
		Services: proj.ServiceNames(),
		Wait:     true,
	}

	return c.svc.Up(ctx, proj, api.UpOptions{Create: upOptions, Start: startOptions})
}

func ComposePs(ctx context.Context, proj *types.Project, services []string, all bool) ([]api.ContainerSummary, error) {
	c, err := NewClient(ctx)
	if err != nil {
		return nil, err
	}
	defer c.Close()

	return c.svc.Ps(ctx, proj.Name, api.PsOptions{All: all})
}

func ComposeDown(ctx context.Context, proj *types.Project, removeVolumes bool) error {
	c, err := NewClient(ctx)
	if err != nil {
		return err
	}
	defer c.Close()

	return c.svc.Down(ctx, proj.Name, api.DownOptions{RemoveOrphans: true, Volumes: removeVolumes})
}

func ComposeLogs(ctx context.Context, projectName string, out io.Writer, follow bool, tail string) error {
	c, err := NewClient(ctx)
	if err != nil {
		return err
	}
	defer c.Close()

	return c.svc.Logs(ctx, projectName, writerConsumer{out: out}, api.LogOptions{Follow: follow, Tail: tail})
}
