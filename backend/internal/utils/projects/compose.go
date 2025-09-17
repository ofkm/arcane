package projects

import (
	"context"
	"io"
	"strings"

	"github.com/compose-spec/compose-go/v2/types"
	"github.com/docker/cli/cli/command"
	"github.com/docker/cli/cli/flags"
	"github.com/docker/compose/v2/pkg/api"
	composev2 "github.com/docker/compose/v2/pkg/compose"
)

type Client struct {
	svc       api.Service
	dockerCli command.Cli
}

func NewClient(ctx context.Context) (*Client, error) {
	cli, err := command.NewDockerCli()
	if err != nil {
		return nil, err
	}
	opts := flags.NewClientOptions()
	if err := cli.Initialize(opts); err != nil {
		return nil, err
	}
	svc := composev2.NewComposeService(cli)
	return &Client{svc: svc, dockerCli: cli}, nil
}

func (c *Client) Close() error {
	if c == nil || c.dockerCli == nil {
		return nil
	}
	if apiClient := c.dockerCli.Client(); apiClient != nil {
		_ = apiClient.Close()
	}
	return nil
}

func (c *Client) Up(ctx context.Context, proj *types.Project, opts api.UpOptions) error {
	return c.svc.Up(ctx, proj, opts)
}

func (c *Client) Down(ctx context.Context, proj *types.Project, opts api.DownOptions) error {
	return c.svc.Down(ctx, proj.Name, opts)
}

func (c *Client) Pull(ctx context.Context, proj *types.Project, opts api.PullOptions) error {
	return c.svc.Pull(ctx, proj, opts)
}

func (c *Client) Restart(ctx context.Context, proj *types.Project, services []string) error {
	return c.svc.Restart(ctx, proj.Name, api.RestartOptions{Services: services})
}

func (c *Client) Create(ctx context.Context, proj *types.Project, opts api.CreateOptions) error {
	return c.svc.Create(ctx, proj, opts)
}

func (c *Client) Start(ctx context.Context, projectName string, opts api.StartOptions) error {
	return c.svc.Start(ctx, projectName, opts)
}

type writerConsumer struct{ out io.Writer }

func (w writerConsumer) Register(container string)    {}
func (w writerConsumer) Start(container string)       {}
func (w writerConsumer) Stop(container string)        {}
func (w writerConsumer) Status(container, msg string) {}
func (w writerConsumer) Log(container, msg string) {
	if w.out == nil {
		return
	}
	if !strings.HasSuffix(msg, "\n") {
		msg += "\n"
	}
	_, _ = io.WriteString(w.out, msg)
}
func (w writerConsumer) Err(container, msg string) {
	if w.out == nil {
		return
	}
	if !strings.HasSuffix(msg, "\n") {
		msg += "\n"
	}
	_, _ = io.WriteString(w.out, msg)
}

func (c *Client) Logs(ctx context.Context, projectName string, out io.Writer, opts api.LogOptions) error {
	return c.svc.Logs(ctx, projectName, writerConsumer{out: out}, opts)
}

func (c *Client) Ps(ctx context.Context, proj *types.Project, opts api.PsOptions) ([]api.ContainerSummary, error) {
	return c.svc.Ps(ctx, proj.Name, opts)
}
