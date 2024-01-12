// Copyright (c) 2024 Gitpod GmbH. All rights reserved.
// Licensed under the GNU Affero General Public License (AGPL).
// See License.AGPL.txt in the project root for license information.

// Code generated by protoc-gen-connect-go. DO NOT EDIT.
//
// Source: gitpod/experimental/v1/projects.proto

package v1connect

import (
	context "context"
	errors "errors"
	connect_go "github.com/bufbuild/connect-go"
	v1 "github.com/gitpod-io/gitpod/components/public-api/go/experimental/v1"
	http "net/http"
	strings "strings"
)

// This is a compile-time assertion to ensure that this generated file and the connect package are
// compatible. If you get a compiler error that this constant is not defined, this code was
// generated with a version of connect newer than the one compiled into your binary. You can fix the
// problem by either regenerating this code with an older version of connect or updating the connect
// version compiled into your binary.
const _ = connect_go.IsAtLeastVersion0_1_0

const (
	// ProjectsServiceName is the fully-qualified name of the ProjectsService service.
	ProjectsServiceName = "gitpod.experimental.v1.ProjectsService"
)

// ProjectsServiceClient is a client for the gitpod.experimental.v1.ProjectsService service.
type ProjectsServiceClient interface {
	// Creates a new project.
	CreateProject(context.Context, *connect_go.Request[v1.CreateProjectRequest]) (*connect_go.Response[v1.CreateProjectResponse], error)
	// Retrieves a project.
	GetProject(context.Context, *connect_go.Request[v1.GetProjectRequest]) (*connect_go.Response[v1.GetProjectResponse], error)
	// Lists projects.
	ListProjects(context.Context, *connect_go.Request[v1.ListProjectsRequest]) (*connect_go.Response[v1.ListProjectsResponse], error)
	// Deletes a project.
	DeleteProject(context.Context, *connect_go.Request[v1.DeleteProjectRequest]) (*connect_go.Response[v1.DeleteProjectResponse], error)
}

// NewProjectsServiceClient constructs a client for the gitpod.experimental.v1.ProjectsService
// service. By default, it uses the Connect protocol with the binary Protobuf Codec, asks for
// gzipped responses, and sends uncompressed requests. To use the gRPC or gRPC-Web protocols, supply
// the connect.WithGRPC() or connect.WithGRPCWeb() options.
//
// The URL supplied here should be the base URL for the Connect or gRPC server (for example,
// http://api.acme.com or https://acme.com/grpc).
func NewProjectsServiceClient(httpClient connect_go.HTTPClient, baseURL string, opts ...connect_go.ClientOption) ProjectsServiceClient {
	baseURL = strings.TrimRight(baseURL, "/")
	return &projectsServiceClient{
		createProject: connect_go.NewClient[v1.CreateProjectRequest, v1.CreateProjectResponse](
			httpClient,
			baseURL+"/gitpod.experimental.v1.ProjectsService/CreateProject",
			opts...,
		),
		getProject: connect_go.NewClient[v1.GetProjectRequest, v1.GetProjectResponse](
			httpClient,
			baseURL+"/gitpod.experimental.v1.ProjectsService/GetProject",
			opts...,
		),
		listProjects: connect_go.NewClient[v1.ListProjectsRequest, v1.ListProjectsResponse](
			httpClient,
			baseURL+"/gitpod.experimental.v1.ProjectsService/ListProjects",
			opts...,
		),
		deleteProject: connect_go.NewClient[v1.DeleteProjectRequest, v1.DeleteProjectResponse](
			httpClient,
			baseURL+"/gitpod.experimental.v1.ProjectsService/DeleteProject",
			opts...,
		),
	}
}

// projectsServiceClient implements ProjectsServiceClient.
type projectsServiceClient struct {
	createProject *connect_go.Client[v1.CreateProjectRequest, v1.CreateProjectResponse]
	getProject    *connect_go.Client[v1.GetProjectRequest, v1.GetProjectResponse]
	listProjects  *connect_go.Client[v1.ListProjectsRequest, v1.ListProjectsResponse]
	deleteProject *connect_go.Client[v1.DeleteProjectRequest, v1.DeleteProjectResponse]
}

// CreateProject calls gitpod.experimental.v1.ProjectsService.CreateProject.
func (c *projectsServiceClient) CreateProject(ctx context.Context, req *connect_go.Request[v1.CreateProjectRequest]) (*connect_go.Response[v1.CreateProjectResponse], error) {
	return c.createProject.CallUnary(ctx, req)
}

// GetProject calls gitpod.experimental.v1.ProjectsService.GetProject.
func (c *projectsServiceClient) GetProject(ctx context.Context, req *connect_go.Request[v1.GetProjectRequest]) (*connect_go.Response[v1.GetProjectResponse], error) {
	return c.getProject.CallUnary(ctx, req)
}

// ListProjects calls gitpod.experimental.v1.ProjectsService.ListProjects.
func (c *projectsServiceClient) ListProjects(ctx context.Context, req *connect_go.Request[v1.ListProjectsRequest]) (*connect_go.Response[v1.ListProjectsResponse], error) {
	return c.listProjects.CallUnary(ctx, req)
}

// DeleteProject calls gitpod.experimental.v1.ProjectsService.DeleteProject.
func (c *projectsServiceClient) DeleteProject(ctx context.Context, req *connect_go.Request[v1.DeleteProjectRequest]) (*connect_go.Response[v1.DeleteProjectResponse], error) {
	return c.deleteProject.CallUnary(ctx, req)
}

// ProjectsServiceHandler is an implementation of the gitpod.experimental.v1.ProjectsService
// service.
type ProjectsServiceHandler interface {
	// Creates a new project.
	CreateProject(context.Context, *connect_go.Request[v1.CreateProjectRequest]) (*connect_go.Response[v1.CreateProjectResponse], error)
	// Retrieves a project.
	GetProject(context.Context, *connect_go.Request[v1.GetProjectRequest]) (*connect_go.Response[v1.GetProjectResponse], error)
	// Lists projects.
	ListProjects(context.Context, *connect_go.Request[v1.ListProjectsRequest]) (*connect_go.Response[v1.ListProjectsResponse], error)
	// Deletes a project.
	DeleteProject(context.Context, *connect_go.Request[v1.DeleteProjectRequest]) (*connect_go.Response[v1.DeleteProjectResponse], error)
}

// NewProjectsServiceHandler builds an HTTP handler from the service implementation. It returns the
// path on which to mount the handler and the handler itself.
//
// By default, handlers support the Connect, gRPC, and gRPC-Web protocols with the binary Protobuf
// and JSON codecs. They also support gzip compression.
func NewProjectsServiceHandler(svc ProjectsServiceHandler, opts ...connect_go.HandlerOption) (string, http.Handler) {
	mux := http.NewServeMux()
	mux.Handle("/gitpod.experimental.v1.ProjectsService/CreateProject", connect_go.NewUnaryHandler(
		"/gitpod.experimental.v1.ProjectsService/CreateProject",
		svc.CreateProject,
		opts...,
	))
	mux.Handle("/gitpod.experimental.v1.ProjectsService/GetProject", connect_go.NewUnaryHandler(
		"/gitpod.experimental.v1.ProjectsService/GetProject",
		svc.GetProject,
		opts...,
	))
	mux.Handle("/gitpod.experimental.v1.ProjectsService/ListProjects", connect_go.NewUnaryHandler(
		"/gitpod.experimental.v1.ProjectsService/ListProjects",
		svc.ListProjects,
		opts...,
	))
	mux.Handle("/gitpod.experimental.v1.ProjectsService/DeleteProject", connect_go.NewUnaryHandler(
		"/gitpod.experimental.v1.ProjectsService/DeleteProject",
		svc.DeleteProject,
		opts...,
	))
	return "/gitpod.experimental.v1.ProjectsService/", mux
}

// UnimplementedProjectsServiceHandler returns CodeUnimplemented from all methods.
type UnimplementedProjectsServiceHandler struct{}

func (UnimplementedProjectsServiceHandler) CreateProject(context.Context, *connect_go.Request[v1.CreateProjectRequest]) (*connect_go.Response[v1.CreateProjectResponse], error) {
	return nil, connect_go.NewError(connect_go.CodeUnimplemented, errors.New("gitpod.experimental.v1.ProjectsService.CreateProject is not implemented"))
}

func (UnimplementedProjectsServiceHandler) GetProject(context.Context, *connect_go.Request[v1.GetProjectRequest]) (*connect_go.Response[v1.GetProjectResponse], error) {
	return nil, connect_go.NewError(connect_go.CodeUnimplemented, errors.New("gitpod.experimental.v1.ProjectsService.GetProject is not implemented"))
}

func (UnimplementedProjectsServiceHandler) ListProjects(context.Context, *connect_go.Request[v1.ListProjectsRequest]) (*connect_go.Response[v1.ListProjectsResponse], error) {
	return nil, connect_go.NewError(connect_go.CodeUnimplemented, errors.New("gitpod.experimental.v1.ProjectsService.ListProjects is not implemented"))
}

func (UnimplementedProjectsServiceHandler) DeleteProject(context.Context, *connect_go.Request[v1.DeleteProjectRequest]) (*connect_go.Response[v1.DeleteProjectResponse], error) {
	return nil, connect_go.NewError(connect_go.CodeUnimplemented, errors.New("gitpod.experimental.v1.ProjectsService.DeleteProject is not implemented"))
}
