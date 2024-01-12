// Copyright (c) 2024 Gitpod GmbH. All rights reserved.
// Licensed under the GNU Affero General Public License (AGPL).
// See License.AGPL.txt in the project root for license information.

// Code generated by protoc-gen-connect-go. DO NOT EDIT.
//
// Source: gitpod/experimental/v1/stats.proto

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
	// StatsServiceName is the fully-qualified name of the StatsService service.
	StatsServiceName = "gitpod.experimental.v1.StatsService"
)

// StatsServiceClient is a client for the gitpod.experimental.v1.StatsService service.
type StatsServiceClient interface {
	// Retrieves the current user stats
	GetUserStats(context.Context, *connect_go.Request[v1.GetUserStatsRequest]) (*connect_go.Response[v1.GetUserStatsResponse], error)
}

// NewStatsServiceClient constructs a client for the gitpod.experimental.v1.StatsService service. By
// default, it uses the Connect protocol with the binary Protobuf Codec, asks for gzipped responses,
// and sends uncompressed requests. To use the gRPC or gRPC-Web protocols, supply the
// connect.WithGRPC() or connect.WithGRPCWeb() options.
//
// The URL supplied here should be the base URL for the Connect or gRPC server (for example,
// http://api.acme.com or https://acme.com/grpc).
func NewStatsServiceClient(httpClient connect_go.HTTPClient, baseURL string, opts ...connect_go.ClientOption) StatsServiceClient {
	baseURL = strings.TrimRight(baseURL, "/")
	return &statsServiceClient{
		getUserStats: connect_go.NewClient[v1.GetUserStatsRequest, v1.GetUserStatsResponse](
			httpClient,
			baseURL+"/gitpod.experimental.v1.StatsService/GetUserStats",
			opts...,
		),
	}
}

// statsServiceClient implements StatsServiceClient.
type statsServiceClient struct {
	getUserStats *connect_go.Client[v1.GetUserStatsRequest, v1.GetUserStatsResponse]
}

// GetUserStats calls gitpod.experimental.v1.StatsService.GetUserStats.
func (c *statsServiceClient) GetUserStats(ctx context.Context, req *connect_go.Request[v1.GetUserStatsRequest]) (*connect_go.Response[v1.GetUserStatsResponse], error) {
	return c.getUserStats.CallUnary(ctx, req)
}

// StatsServiceHandler is an implementation of the gitpod.experimental.v1.StatsService service.
type StatsServiceHandler interface {
	// Retrieves the current user stats
	GetUserStats(context.Context, *connect_go.Request[v1.GetUserStatsRequest]) (*connect_go.Response[v1.GetUserStatsResponse], error)
}

// NewStatsServiceHandler builds an HTTP handler from the service implementation. It returns the
// path on which to mount the handler and the handler itself.
//
// By default, handlers support the Connect, gRPC, and gRPC-Web protocols with the binary Protobuf
// and JSON codecs. They also support gzip compression.
func NewStatsServiceHandler(svc StatsServiceHandler, opts ...connect_go.HandlerOption) (string, http.Handler) {
	mux := http.NewServeMux()
	mux.Handle("/gitpod.experimental.v1.StatsService/GetUserStats", connect_go.NewUnaryHandler(
		"/gitpod.experimental.v1.StatsService/GetUserStats",
		svc.GetUserStats,
		opts...,
	))
	return "/gitpod.experimental.v1.StatsService/", mux
}

// UnimplementedStatsServiceHandler returns CodeUnimplemented from all methods.
type UnimplementedStatsServiceHandler struct{}

func (UnimplementedStatsServiceHandler) GetUserStats(context.Context, *connect_go.Request[v1.GetUserStatsRequest]) (*connect_go.Response[v1.GetUserStatsResponse], error) {
	return nil, connect_go.NewError(connect_go.CodeUnimplemented, errors.New("gitpod.experimental.v1.StatsService.GetUserStats is not implemented"))
}
