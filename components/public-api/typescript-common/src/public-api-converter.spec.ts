/* eslint-disable @typescript-eslint/no-unsafe-argument */
/**
 * Copyright (c) 2023 Gitpod GmbH. All rights reserved.
 * Licensed under the GNU Affero General Public License (AGPL).
 * See License.AGPL.txt in the project root for license information.
 */

import { Timestamp, toPlainMessage } from "@bufbuild/protobuf";
import {
    AdmissionLevel,
    Workspace,
    WorkspacePhase_Phase,
    WorkspacePort_Protocol,
    WorkspaceSpec_WorkspaceType,
} from "@gitpod/public-api/lib/gitpod/v1/workspace_pb";
import { expect } from "chai";
import { PartialConfiguration, PublicAPIConverter } from "./public-api-converter";
import {
    OrgMemberInfo,
    Project,
    PrebuildSettings as PrebuildSettingsProtocol,
} from "@gitpod/gitpod-protocol/lib/teams-projects-protocol";
import { OrganizationRole } from "@gitpod/public-api/lib/gitpod/v1/organization_pb";
import {
    BranchMatchingStrategy,
    PrebuildSettings,
    WorkspaceSettings,
} from "@gitpod/public-api/lib/gitpod/v1/configuration_pb";
import {
    AuthProviderEntry,
    AuthProviderInfo,
    EmailDomainFilterEntry,
    ProjectEnvVar,
    SuggestedRepository,
    Token,
    UserEnvVarValue,
    UserSSHPublicKey,
    WithEnvvarsContext,
} from "@gitpod/gitpod-protocol/lib/protocol";
import {
    AuthProvider,
    AuthProviderDescription,
    AuthProviderType,
} from "@gitpod/public-api/lib/gitpod/v1/authprovider_pb";
import {
    ConfigurationEnvironmentVariable,
    EnvironmentVariable,
    EnvironmentVariableAdmission,
    UserEnvironmentVariable,
} from "@gitpod/public-api/lib/gitpod/v1/envvar_pb";
import { ApplicationError, ErrorCodes } from "@gitpod/gitpod-protocol/lib/messaging/error";
import { InvalidGitpodYMLError, RepositoryNotFoundError, UnauthorizedRepositoryAccessError } from "./public-api-errors";
import { Code, ConnectError } from "@connectrpc/connect";
import {
    FailedPreconditionDetails,
    NeedsVerificationError,
    PermissionDeniedDetails,
    UserBlockedError,
    InvalidGitpodYMLError as InvalidGitpodYMLErrorData,
    RepositoryNotFoundError as RepositoryNotFoundErrorData,
    RepositoryUnauthorizedError as RepositoryUnauthorizedErrorData,
    PaymentSpendingLimitReachedError,
    InvalidCostCenterError,
    ImageBuildLogsNotYetAvailableError,
    TooManyRunningWorkspacesError,
} from "@gitpod/public-api/lib/gitpod/v1/error_pb";
import { SSHPublicKey } from "@gitpod/public-api/lib/gitpod/v1/ssh_pb";
import { BlockedRepository as ProtocolBlockedRepository } from "@gitpod/gitpod-protocol/lib/blocked-repositories-protocol";
import { BlockedEmailDomain, BlockedRepository } from "@gitpod/public-api/lib/gitpod/v1/installation_pb";

describe("PublicAPIConverter", () => {
    const converter = new PublicAPIConverter();

    describe("toOrganization", () => {
        it("should convert a ProtocolOrganization to an Organization", () => {
            const org = {
                id: "123",
                name: "My Org",
                slug: "my-org",
                creationTime: "2022-01-01T00:00:00.000Z",
            };
            const result = converter.toOrganization(org);
            expect(result.id).to.equal(org.id);
            expect(result.name).to.equal(org.name);
            expect(result.slug).to.equal(org.slug);
            expect(result.creationTime).to.deep.equal(Timestamp.fromDate(new Date(org.creationTime)));
        });
    });

    describe("toOrganizationMember", () => {
        it("should convert an OrgMemberInfo to an OrganizationMember", () => {
            const member: OrgMemberInfo = {
                userId: "456",
                fullName: "John Doe",
                primaryEmail: "john.doe@example.com",
                avatarUrl: "https://example.com/avatar.jpg",
                role: "owner",
                memberSince: "2022-01-01T00:00:00.000Z",
                ownedByOrganization: true,
            };
            const result = converter.toOrganizationMember(member);
            expect(result.userId).to.equal(member.userId);
            expect(result.fullName).to.equal(member.fullName);
            expect(result.email).to.equal(member.primaryEmail);
            expect(result.avatarUrl).to.equal(member.avatarUrl);
            expect(result.role).to.equal(converter.toOrgMemberRole(member.role));
            expect(result.memberSince).to.deep.equal(Timestamp.fromDate(new Date(member.memberSince)));
            expect(result.ownedByOrganization).to.equal(member.ownedByOrganization);
        });
    });

    describe("toOrgMemberRole", () => {
        it("should convert an OrgMemberRole to an OrganizationRole", () => {
            expect(converter.toOrgMemberRole("owner")).to.equal(OrganizationRole.OWNER);
            expect(converter.toOrgMemberRole("member")).to.equal(OrganizationRole.MEMBER);
            expect(converter.toOrgMemberRole("unknown" as any)).to.equal(OrganizationRole.UNSPECIFIED);
        });
    });

    describe("fromOrgMemberRole", () => {
        it("should convert an OrganizationRole to an OrgMemberRole", () => {
            expect(converter.fromOrgMemberRole(OrganizationRole.OWNER)).to.equal("owner");
            expect(converter.fromOrgMemberRole(OrganizationRole.MEMBER)).to.equal("member");
            expect(() => converter.fromOrgMemberRole(OrganizationRole.UNSPECIFIED)).to.throw(Error);
        });
    });

    describe("fromPartialConfiguration", () => {
        it("should convert a configuration name change to a Project", () => {
            const config: PartialConfiguration = {
                id: "123",
                name: "My Config",
            };
            const result = converter.fromPartialConfiguration(config);
            expect(result.id).to.equal(config.id);
            expect(result.settings).to.be.undefined;
        });
        it("should carry over Configuration settings correctly", () => {
            const config: PartialConfiguration = {
                id: "123",
                name: undefined,
                workspaceSettings: {
                    workspaceClass: "huge",
                },
                prebuildSettings: {
                    enabled: true,
                    prebuildInterval: 5,
                },
            };
            const result = converter.fromPartialConfiguration(config);
            expect(result.id).to.equal(config.id);
            expect(result.settings?.workspaceClasses?.regular).to.deep.equal("huge");
            expect(result.settings?.prebuilds?.enable).to.deep.equal(true);
            expect(result.settings?.prebuilds?.prebuildInterval).to.deep.equal(5);
            expect(result).to.not.have.property("name");
            expect(result).to.not.have.deep.property("result.settings.prebuilds.workspaceClass");
            expect(result).to.not.have.deep.property("result.settings.prebuilds.branchStrategy");
        });
    });

    describe("testToWorkspace", () => {
        it("should convert workspaces", () => {
            let workspace = converter.toWorkspace({
                workspace: {
                    id: "akosyakov-parceldemo-4crqn25qlwi",
                    creationTime: "2023-10-16T20:18:24.859Z",
                    organizationId: "ec76db37-9a48-4e2d-a78e-0ec7d2b4d2c0",
                    ownerId: "827df1c8-d42d-4a69-bc38-64089af1f711",
                    contextURL: "https://github.com/akosyakov/parcel-demo",
                    description: "akosyakov/parcel-demo - master",
                    context: {
                        isFile: false,
                        path: "",
                        title: "akosyakov/parcel-demo - master",
                        ref: "master",
                        refType: "branch",
                        revision: "60dbf818194082ef1a368bacd49cfd25a34c9256",
                        repository: {
                            cloneUrl: "https://github.com/akosyakov/parcel-demo.git",
                            host: "github.com",
                            defaultBranch: "master",
                            name: "parcel-demo",
                            owner: "akosyakov",
                            private: false,
                        },
                        normalizedContextURL: "https://github.com/akosyakov/parcel-demo",
                        checkoutLocation: "parcel-demo",
                    },
                    cloneUrl: "https://github.com/akosyakov/parcel-demo.git",
                    config: {
                        tasks: [
                            {
                                init: "yarn",
                                command: "yarn serve",
                            },
                            {
                                command: "gp open index.js\ngp preview $(gp url 1234)\n",
                                openMode: "split-right",
                            },
                        ],
                        _origin: "repo",
                        image: "docker.io/gitpod/workspace-full:latest",
                        vscode: {
                            extensions: [],
                        },
                    },
                    imageSource: {
                        baseImageResolved: "docker.io/gitpod/workspace-full:latest",
                    },
                    imageNameResolved:
                        "eu.gcr.io/gitpod-core-dev/build/workspace-images:d6d9404137cc976d4da4d450474cb515bc0512281a3649c1cab9309ba7caee65",
                    baseImageNameResolved:
                        "docker.io/gitpod/workspace-full@sha256:10d6ab95512fe70bf6274976b19f94327570559e3d29f4b1cb01735b6fe534bb",
                    shareable: false,
                    type: "regular",
                    softDeleted: null,
                    deleted: false,
                    pinned: false,
                },
                latestInstance: {
                    id: "226695b4-f10a-471a-a219-9b657645bf78",
                    workspaceId: "akosyakov-parceldemo-4crqn25qlwi",
                    region: "dev",
                    creationTime: "2023-10-16T20:18:24.923Z",
                    ideUrl: "https://akosyakov-parceldemo-4crqn25qlwi.ws-dev.ak-public-26583c8c5c.preview.gitpod-dev.com",
                    status: {
                        phase: "creating",
                        message: "",
                        timeout: "30m0s",
                        version: 220880,
                        conditions: {
                            failed: "",
                            timeout: "",
                            deployed: true,
                            pullingImages: false,
                            stoppedByRequest: false,
                            headlessTaskFailed: "",
                        },
                        exposedPorts: [],
                    },
                    gitStatus: null,
                    phasePersisted: "creating",
                    deleted: false,
                    configuration: {
                        ideImage:
                            "eu.gcr.io/gitpod-core-dev/build/ide/code:commit-e77f3a07ea76bbb404d3f6bf4af36269afc45df1",
                        ideImageLayers: [
                            "eu.gcr.io/gitpod-core-dev/build/ide/gitpod-code-web:commit-49bb715b599dce2356dd02a6ede7ae8cf10d8d12",
                            "eu.gcr.io/gitpod-core-dev/build/ide/code-codehelper:commit-18a48e2ccb779a268355d2b58a167c73de023547",
                        ],
                        supervisorImage:
                            "eu.gcr.io/gitpod-core-dev/build/supervisor:commit-cda78d5706672b9a41e15d84a128cdb24357ad87",
                        ideConfig: {
                            useLatest: false,
                            ide: "code",
                        },
                        ideSetup: {
                            envvars: [
                                {
                                    name: "GITPOD_CONFIGCAT_ENABLED",
                                    value: "true",
                                },
                                {
                                    name: "GITPOD_IDE_ALIAS",
                                    value: "code",
                                },
                            ],
                            tasks: [],
                        },
                        regionPreference: "",
                        fromBackup: false,
                        featureFlags: ["workspace_connection_limiting", "workspace_class_limiting"],
                    },
                    imageBuildInfo: null,
                    workspaceClass: "g1-standard",
                    usageAttributionId: "team:ec76db37-9a48-4e2d-a78e-0ec7d2b4d2c0",
                },
            } as any);
            expect(workspace).to.deep.equal(
                new Workspace({
                    id: "akosyakov-parceldemo-4crqn25qlwi",
                    spec: {
                        ports: [],
                        type: WorkspaceSpec_WorkspaceType.REGULAR,
                        admission: AdmissionLevel.OWNER_ONLY,
                        environmentVariables: [],
                        initializer: {
                            specs: [
                                {
                                    spec: {
                                        case: "git",
                                        value: {
                                            remoteUri: "https://github.com/akosyakov/parcel-demo",
                                            checkoutLocation: "parcel-demo",
                                            config: {},
                                        },
                                    },
                                },
                            ],
                        },
                        git: {
                            username: "",
                            email: "",
                        },
                        class: "g1-standard",
                        editor: {
                            name: "code",
                            version: "stable",
                        },
                    },
                    metadata: {
                        ownerId: "827df1c8-d42d-4a69-bc38-64089af1f711",
                        configurationId: "",
                        organizationId: "ec76db37-9a48-4e2d-a78e-0ec7d2b4d2c0",
                        name: "akosyakov/parcel-demo - master",
                        pinned: false,
                        originalContextUrl: "https://github.com/akosyakov/parcel-demo",
                    },
                    status: {
                        statusVersion: Timestamp.fromDate(new Date("2023-10-16T20:18:24.923Z")).seconds,
                        phase: {
                            name: WorkspacePhase_Phase.CREATING,
                            lastTransitionTime: Timestamp.fromDate(new Date("2023-10-16T20:18:24.923Z")),
                        },
                        workspaceUrl:
                            "https://akosyakov-parceldemo-4crqn25qlwi.ws-dev.ak-public-26583c8c5c.preview.gitpod-dev.com",
                        gitStatus: {
                            branch: "master",
                            cloneUrl: "https://github.com/akosyakov/parcel-demo.git",
                            latestCommit: "60dbf818194082ef1a368bacd49cfd25a34c9256",
                            totalUncommitedFiles: 0,
                            totalUnpushedCommits: 0,
                            totalUntrackedFiles: 0,
                            uncommitedFiles: [],
                            unpushedCommits: [],
                            untrackedFiles: [],
                        },
                        instanceId: "226695b4-f10a-471a-a219-9b657645bf78",
                        conditions: {
                            failed: "",
                            timeout: "",
                        },
                    },
                }),
                "created",
            );
            workspace = converter.toWorkspace(
                {
                    id: "226695b4-f10a-471a-a219-9b657645bf78",
                    workspaceId: "akosyakov-parceldemo-4crqn25qlwi",
                    region: "dev",
                    creationTime: "2023-10-16T20:18:24.923Z",
                    startedTime: "2023-10-16T20:18:53.451Z",
                    ideUrl: "https://akosyakov-parceldemo-4crqn25qlwi.ws-dev.ak-public-26583c8c5c.preview.gitpod-dev.com",
                    status: {
                        phase: "running",
                        message: "",
                        timeout: "30m0s",
                        version: 221053,
                        conditions: {
                            failed: "",
                            timeout: "",
                            deployed: true,
                            pullingImages: false,
                            stoppedByRequest: false,
                            firstUserActivity: "2023-10-16T20:18:53.000Z",
                            headlessTaskFailed: "",
                        },
                        exposedPorts: [
                            {
                                url: "https://1234-akosyakov-parceldemo-4crqn25qlwi.ws-dev.ak-public-26583c8c5c.preview.gitpod-dev.com",
                                port: 1234,
                                protocol: "http",
                                visibility: "public",
                            },
                        ],
                    },
                    gitStatus: {
                        branch: "ak/test",
                        latestCommit: "2203d16573ee3838e6a2a19d5cf678fb706f4885",
                        uncommitedFiles: ["index.js"],
                        unpushedCommits: ["2203d16: tests"],
                        totalUncommitedFiles: 1,
                        totalUnpushedCommits: 1,
                    },
                    phasePersisted: "running",
                    deleted: false,
                    configuration: {
                        ideImage:
                            "eu.gcr.io/gitpod-core-dev/build/ide/code:commit-e77f3a07ea76bbb404d3f6bf4af36269afc45df1",
                        ideImageLayers: [
                            "eu.gcr.io/gitpod-core-dev/build/ide/gitpod-code-web:commit-49bb715b599dce2356dd02a6ede7ae8cf10d8d12",
                            "eu.gcr.io/gitpod-core-dev/build/ide/code-codehelper:commit-18a48e2ccb779a268355d2b58a167c73de023547",
                        ],
                        supervisorImage:
                            "eu.gcr.io/gitpod-core-dev/build/supervisor:commit-cda78d5706672b9a41e15d84a128cdb24357ad87",
                        ideConfig: {
                            useLatest: false,
                            ide: "code",
                        },
                        ideSetup: {
                            envvars: [
                                {
                                    name: "GITPOD_CONFIGCAT_ENABLED",
                                    value: "true",
                                },
                                {
                                    name: "GITPOD_IDE_ALIAS",
                                    value: "code",
                                },
                            ],
                            tasks: [],
                        },
                        regionPreference: "",
                        fromBackup: false,
                        featureFlags: ["workspace_connection_limiting", "workspace_class_limiting"],
                    },
                    imageBuildInfo: null,
                    workspaceClass: "g1-standard",
                    usageAttributionId: "team:ec76db37-9a48-4e2d-a78e-0ec7d2b4d2c0",
                } as any,
                workspace,
            );
            expect(workspace).to.deep.equal(
                new Workspace({
                    id: "akosyakov-parceldemo-4crqn25qlwi",
                    spec: {
                        type: WorkspaceSpec_WorkspaceType.REGULAR,
                        editor: {
                            name: "code",
                            version: "stable",
                        },
                        ports: [
                            {
                                admission: AdmissionLevel.EVERYONE,
                                port: BigInt(1234),
                                protocol: WorkspacePort_Protocol.HTTP,
                                url: "https://1234-akosyakov-parceldemo-4crqn25qlwi.ws-dev.ak-public-26583c8c5c.preview.gitpod-dev.com",
                            },
                        ],
                        admission: AdmissionLevel.OWNER_ONLY,
                        environmentVariables: [],
                        class: "g1-standard",
                        initializer: {
                            specs: [
                                {
                                    spec: {
                                        case: "git",
                                        value: {
                                            remoteUri: "https://github.com/akosyakov/parcel-demo",
                                            checkoutLocation: "parcel-demo",
                                            config: {},
                                        },
                                    },
                                },
                            ],
                        },
                        git: {
                            username: "",
                            email: "",
                        },
                    },
                    metadata: {
                        ownerId: "827df1c8-d42d-4a69-bc38-64089af1f711",
                        organizationId: "ec76db37-9a48-4e2d-a78e-0ec7d2b4d2c0",
                        annotations: {},
                        configurationId: "",
                        name: "akosyakov/parcel-demo - master",
                        pinned: false,
                        originalContextUrl: "https://github.com/akosyakov/parcel-demo",
                    },
                    status: {
                        statusVersion: Timestamp.fromDate(new Date("2023-10-16T20:18:53.451Z")).seconds,
                        phase: {
                            name: WorkspacePhase_Phase.RUNNING,
                            lastTransitionTime: Timestamp.fromDate(new Date("2023-10-16T20:18:53.451Z")),
                        },
                        workspaceUrl:
                            "https://akosyakov-parceldemo-4crqn25qlwi.ws-dev.ak-public-26583c8c5c.preview.gitpod-dev.com",
                        gitStatus: {
                            branch: "ak/test",
                            cloneUrl: "https://github.com/akosyakov/parcel-demo.git",
                            latestCommit: "2203d16573ee3838e6a2a19d5cf678fb706f4885",
                            totalUncommitedFiles: 1,
                            totalUnpushedCommits: 1,
                            totalUntrackedFiles: 0,
                            uncommitedFiles: ["index.js"],
                            unpushedCommits: ["2203d16: tests"],
                            untrackedFiles: [],
                        },
                        instanceId: "226695b4-f10a-471a-a219-9b657645bf78",
                        conditions: {
                            failed: "",
                            timeout: "",
                        },
                    },
                }),
                "running",
            );
            workspace = converter.toWorkspace(
                {
                    id: "226695b4-f10a-471a-a219-9b657645bf78",
                    workspaceId: "akosyakov-parceldemo-4crqn25qlwi",
                    region: "dev",
                    creationTime: "2023-10-16T20:18:24.923Z",
                    startedTime: "2023-10-16T20:18:53.451Z",
                    stoppingTime: "2023-10-16T20:36:14.802Z",
                    stoppedTime: "2023-10-16T20:36:16.205Z",
                    ideUrl: "https://akosyakov-parceldemo-4crqn25qlwi.ws-dev.ak-public-26583c8c5c.preview.gitpod-dev.com",
                    status: {
                        repo: {
                            branch: "ak/test",
                            latestCommit: "2203d16573ee3838e6a2a19d5cf678fb706f4885",
                            uncommitedFiles: ["index.js"],
                            unpushedCommits: ["2203d16: tests"],
                            totalUntrackedFiles: 0,
                            totalUncommitedFiles: 1,
                            totalUnpushedCommits: 1,
                        },
                        phase: "stopped",
                        message: "",
                        timeout: "30m0s",
                        version: 226943,
                        conditions: {
                            failed: "",
                            timeout: "",
                            deployed: true,
                            pullingImages: false,
                            stoppedByRequest: true,
                            firstUserActivity: "2023-10-16T20:18:53.000Z",
                            headlessTaskFailed: "",
                        },
                        exposedPorts: [
                            {
                                url: "https://1234-akosyakov-parceldemo-4crqn25qlwi.ws-dev.ak-public-26583c8c5c.preview.gitpod-dev.com",
                                port: 1234,
                                protocol: "http",
                                visibility: "public",
                            },
                        ],
                    },
                    gitStatus: {
                        branch: "ak/test",
                        latestCommit: "2203d16573ee3838e6a2a19d5cf678fb706f4885",
                        uncommitedFiles: ["index.js"],
                        unpushedCommits: ["2203d16: tests"],
                        totalUncommitedFiles: 1,
                        totalUnpushedCommits: 1,
                    },
                    phasePersisted: "stopped",
                    deleted: false,
                    configuration: {
                        ideImage:
                            "eu.gcr.io/gitpod-core-dev/build/ide/code:commit-e77f3a07ea76bbb404d3f6bf4af36269afc45df1",
                        ideImageLayers: [
                            "eu.gcr.io/gitpod-core-dev/build/ide/gitpod-code-web:commit-49bb715b599dce2356dd02a6ede7ae8cf10d8d12",
                            "eu.gcr.io/gitpod-core-dev/build/ide/code-codehelper:commit-18a48e2ccb779a268355d2b58a167c73de023547",
                        ],
                        supervisorImage:
                            "eu.gcr.io/gitpod-core-dev/build/supervisor:commit-cda78d5706672b9a41e15d84a128cdb24357ad87",
                        ideConfig: {
                            useLatest: false,
                            ide: "code",
                        },
                        ideSetup: {
                            envvars: [
                                {
                                    name: "GITPOD_CONFIGCAT_ENABLED",
                                    value: "true",
                                },
                                {
                                    name: "GITPOD_IDE_ALIAS",
                                    value: "code",
                                },
                            ],
                            tasks: [],
                        },
                        regionPreference: "",
                        fromBackup: false,
                        featureFlags: ["workspace_connection_limiting", "workspace_class_limiting"],
                    },
                    imageBuildInfo: null,
                    workspaceClass: "g1-standard",
                    usageAttributionId: "team:ec76db37-9a48-4e2d-a78e-0ec7d2b4d2c0",
                } as any,
                workspace,
            );
            expect(workspace).to.deep.equal(
                new Workspace({
                    id: "akosyakov-parceldemo-4crqn25qlwi",
                    spec: {
                        editor: {
                            name: "code",
                            version: "stable",
                        },
                        ports: [
                            {
                                admission: AdmissionLevel.EVERYONE,
                                port: BigInt(1234),
                                protocol: WorkspacePort_Protocol.HTTP,
                                url: "https://1234-akosyakov-parceldemo-4crqn25qlwi.ws-dev.ak-public-26583c8c5c.preview.gitpod-dev.com",
                            },
                        ],
                        type: WorkspaceSpec_WorkspaceType.REGULAR,
                        admission: AdmissionLevel.OWNER_ONLY,
                        environmentVariables: [],
                        initializer: {
                            specs: [
                                {
                                    spec: {
                                        case: "git",
                                        value: {
                                            remoteUri: "https://github.com/akosyakov/parcel-demo",
                                            checkoutLocation: "parcel-demo",
                                            config: {},
                                        },
                                    },
                                },
                            ],
                        },
                        git: {
                            username: "",
                            email: "",
                        },
                        class: "g1-standard",
                    },
                    metadata: {
                        ownerId: "827df1c8-d42d-4a69-bc38-64089af1f711",
                        configurationId: "",
                        organizationId: "ec76db37-9a48-4e2d-a78e-0ec7d2b4d2c0",
                        name: "akosyakov/parcel-demo - master",
                        pinned: false,
                        originalContextUrl: "https://github.com/akosyakov/parcel-demo",
                    },
                    status: {
                        statusVersion: Timestamp.fromDate(new Date("2023-10-16T20:36:16.205Z")).seconds,

                        phase: {
                            name: WorkspacePhase_Phase.STOPPED,
                            lastTransitionTime: Timestamp.fromDate(new Date("2023-10-16T20:36:16.205Z")),
                        },
                        workspaceUrl:
                            "https://akosyakov-parceldemo-4crqn25qlwi.ws-dev.ak-public-26583c8c5c.preview.gitpod-dev.com",
                        gitStatus: {
                            branch: "ak/test",
                            cloneUrl: "https://github.com/akosyakov/parcel-demo.git",
                            latestCommit: "2203d16573ee3838e6a2a19d5cf678fb706f4885",
                            totalUncommitedFiles: 1,
                            totalUnpushedCommits: 1,
                            totalUntrackedFiles: 0,
                            uncommitedFiles: ["index.js"],
                            unpushedCommits: ["2203d16: tests"],
                            untrackedFiles: [],
                        },
                        instanceId: "226695b4-f10a-471a-a219-9b657645bf78",
                        conditions: {
                            failed: "",
                            timeout: "",
                        },
                    },
                }),
                "stopped",
            );
            workspace = converter.toWorkspace(
                {
                    id: "e1148a46-a311-4215-8421-37cd3b907ee9",
                    workspaceId: "akosyakov-parceldemo-4crqn25qlwi",
                    region: "dev",
                    creationTime: "2023-10-16T20:38:42.942Z",
                    startedTime: "2023-10-16T20:38:51.092Z",
                    ideUrl: "https://akosyakov-parceldemo-4crqn25qlwi.ws-dev.ak-public-26583c8c5c.preview.gitpod-dev.com",
                    status: {
                        phase: "running",
                        message: "",
                        timeout: "30m0s",
                        version: 227857,
                        conditions: {
                            failed: "",
                            timeout: "",
                            deployed: true,
                            pullingImages: false,
                            stoppedByRequest: false,
                            firstUserActivity: "2023-10-16T20:38:51.000Z",
                            headlessTaskFailed: "",
                        },
                        exposedPorts: [],
                    },
                    gitStatus: {
                        branch: "ak/test",
                        latestCommit: "2203d16573ee3838e6a2a19d5cf678fb706f4885",
                        uncommitedFiles: ["index.js"],
                        unpushedCommits: ["2203d16: tests"],
                        totalUncommitedFiles: 1,
                        totalUnpushedCommits: 1,
                    },
                    phasePersisted: "running",
                    deleted: false,
                    configuration: {
                        ideImage:
                            "eu.gcr.io/gitpod-core-dev/build/ide/code:commit-e77f3a07ea76bbb404d3f6bf4af36269afc45df1",
                        ideImageLayers: [
                            "eu.gcr.io/gitpod-core-dev/build/ide/gitpod-code-web:commit-49bb715b599dce2356dd02a6ede7ae8cf10d8d12",
                            "eu.gcr.io/gitpod-core-dev/build/ide/code-codehelper:commit-18a48e2ccb779a268355d2b58a167c73de023547",
                        ],
                        supervisorImage:
                            "eu.gcr.io/gitpod-core-dev/build/supervisor:commit-cda78d5706672b9a41e15d84a128cdb24357ad87",
                        ideConfig: {
                            useLatest: false,
                            ide: "code",
                        },
                        ideSetup: {
                            envvars: [
                                {
                                    name: "GITPOD_CONFIGCAT_ENABLED",
                                    value: "true",
                                },
                                {
                                    name: "GITPOD_IDE_ALIAS",
                                    value: "code",
                                },
                            ],
                            tasks: [],
                        },
                        regionPreference: "",
                        fromBackup: true,
                        featureFlags: ["workspace_connection_limiting", "workspace_class_limiting"],
                    },
                    imageBuildInfo: null,
                    workspaceClass: "g1-standard",
                    usageAttributionId: "team:ec76db37-9a48-4e2d-a78e-0ec7d2b4d2c0",
                } as any,
                workspace,
            );
            expect(workspace).to.deep.equal(
                new Workspace({
                    id: "akosyakov-parceldemo-4crqn25qlwi",
                    metadata: {
                        ownerId: "827df1c8-d42d-4a69-bc38-64089af1f711",
                        organizationId: "ec76db37-9a48-4e2d-a78e-0ec7d2b4d2c0",
                        configurationId: "",
                        name: "akosyakov/parcel-demo - master",
                        pinned: false,
                        originalContextUrl: "https://github.com/akosyakov/parcel-demo",
                    },
                    spec: {
                        editor: {
                            name: "code",
                            version: "stable",
                        },
                        environmentVariables: [],
                        type: WorkspaceSpec_WorkspaceType.REGULAR,
                        git: {
                            username: "",
                            email: "",
                        },
                        ports: [],
                        admission: AdmissionLevel.OWNER_ONLY,
                        class: "g1-standard",
                        initializer: {
                            specs: [
                                {
                                    spec: {
                                        case: "git",
                                        value: {
                                            remoteUri: "https://github.com/akosyakov/parcel-demo",
                                            checkoutLocation: "parcel-demo",
                                            config: {},
                                        },
                                    },
                                },
                            ],
                        },
                    },
                    status: {
                        statusVersion: Timestamp.fromDate(new Date("2023-10-16T20:38:51.092Z")).seconds,
                        phase: {
                            name: WorkspacePhase_Phase.RUNNING,
                            lastTransitionTime: Timestamp.fromDate(new Date("2023-10-16T20:38:51.092Z")),
                        },
                        workspaceUrl:
                            "https://akosyakov-parceldemo-4crqn25qlwi.ws-dev.ak-public-26583c8c5c.preview.gitpod-dev.com",
                        gitStatus: {
                            branch: "ak/test",
                            cloneUrl: "https://github.com/akosyakov/parcel-demo.git",
                            latestCommit: "2203d16573ee3838e6a2a19d5cf678fb706f4885",
                            totalUncommitedFiles: 1,
                            totalUnpushedCommits: 1,
                            totalUntrackedFiles: 0,
                            uncommitedFiles: ["index.js"],
                            unpushedCommits: ["2203d16: tests"],
                            untrackedFiles: [],
                        },
                        instanceId: "e1148a46-a311-4215-8421-37cd3b907ee9",
                        conditions: {
                            failed: "",
                            timeout: "",
                        },
                    },
                }),
                "restarted",
            );
        });
    });

    describe("toConfiguration", () => {
        it("should convert a Project to a Configuration", () => {
            const project: Project = {
                id: "123",
                teamId: "456",
                name: "My Project",
                cloneUrl: "https://github.com/myorg/myproject.git",
                appInstallationId: "",
                creationTime: new Date().toISOString(),
                settings: {
                    workspaceClasses: {
                        regular: "dev",
                    },
                    prebuilds: {
                        enable: true,
                        branchMatchingPattern: "main",
                        branchStrategy: "default-branch",
                        prebuildInterval: 20,
                        workspaceClass: "dev",
                    },
                },
            };
            const result = converter.toConfiguration(project);
            expect(result.id).to.equal(project.id);
            expect(result.organizationId).to.equal(project.teamId);
            expect(result.name).to.equal(project.name);
            expect(result.cloneUrl).to.equal(project.cloneUrl);
            expect(result.creationTime).to.deep.equal(Timestamp.fromDate(new Date(project.creationTime)));
            expect(result.workspaceSettings).to.deep.equal(
                new WorkspaceSettings({
                    workspaceClass: project.settings?.workspaceClasses?.regular,
                }),
            );
            expect(result.prebuildSettings).to.deep.equal(
                new PrebuildSettings({
                    enabled: project.settings?.prebuilds?.enable,
                    branchMatchingPattern: project.settings?.prebuilds?.branchMatchingPattern,
                    branchStrategy: BranchMatchingStrategy.DEFAULT_BRANCH,
                    prebuildInterval: project.settings?.prebuilds?.prebuildInterval,
                    workspaceClass: project.settings?.prebuilds?.workspaceClass,
                }),
            );
        });
    });

    describe("toPrebuildSettings", () => {
        it("should convert a PrebuildSettingsProtocol to a PrebuildSettings", () => {
            const prebuilds: PrebuildSettingsProtocol = {
                enable: true,
                branchMatchingPattern: "main",
                branchStrategy: "default-branch",
                prebuildInterval: 42,
                workspaceClass: "dev",
            };
            const result = converter.toPrebuildSettings(prebuilds);
            expect(result.enabled).to.equal(prebuilds.enable);
            expect(result.branchMatchingPattern).to.equal(prebuilds.branchMatchingPattern);
            expect(result.branchStrategy).to.equal(BranchMatchingStrategy.DEFAULT_BRANCH);
            expect(result.prebuildInterval).to.equal(prebuilds.prebuildInterval);
            expect(result.workspaceClass).to.equal(prebuilds.workspaceClass);
        });

        it("should return an empty PrebuildSettings if no PrebuildSettingsProtocol is provided", () => {
            const result = converter.toPrebuildSettings(undefined);
            expect(result).to.deep.equal(new PrebuildSettings());
        });
    });

    describe("toBranchMatchingStrategy", () => {
        it("should convert a BranchStrategy to a BranchMatchingStrategy", () => {
            expect(converter.toBranchMatchingStrategy("default-branch")).to.equal(
                BranchMatchingStrategy.DEFAULT_BRANCH,
            );
            expect(converter.toBranchMatchingStrategy("all-branches")).to.equal(BranchMatchingStrategy.ALL_BRANCHES);
            expect(converter.toBranchMatchingStrategy("matched-branches")).to.equal(
                BranchMatchingStrategy.MATCHED_BRANCHES,
            );
            expect(converter.toBranchMatchingStrategy(undefined)).to.equal(BranchMatchingStrategy.DEFAULT_BRANCH);
        });
    });

    describe("toWorkspaceSettings", () => {
        it("should convert a workspace class string to a WorkspaceSettings", () => {
            const workspaceClass = "dev";
            const result = converter.toWorkspaceSettings(workspaceClass);
            expect(result).to.deep.equal(new WorkspaceSettings({ workspaceClass }));
        });

        it("should return an empty WorkspaceSettings if no workspace class string is provided", () => {
            const result = converter.toWorkspaceSettings(undefined);
            expect(result).to.deep.equal(new WorkspaceSettings());
        });
    });

    describe("toAuthProviderDescription", () => {
        const info: AuthProviderInfo = {
            authProviderId: "ap123",
            authProviderType: "GitHub",
            host: "localhost",
            verified: true,
            icon: "unused icon",
            description: "unused description",
            settingsUrl: "unused",
            ownerId: "unused",
            organizationId: "unused",
        };
        const description = new AuthProviderDescription({
            id: info.authProviderId,
            type: AuthProviderType.GITHUB,
            host: info.host,
            icon: info.icon,
            description: info.description,
        });
        it("should convert an auth provider info to a description", () => {
            const result = converter.toAuthProviderDescription(info);
            expect(result).to.deep.equal(description);
        });
    });

    describe("toAuthProvider", () => {
        const entry: AuthProviderEntry = {
            id: "ap123",
            type: "GitHub",
            host: "localhost",
            status: "pending",
            ownerId: "userId",
            organizationId: "orgId123",
            oauth: {
                clientId: "clientId123",
                clientSecret: "should not appear in result",
                callBackUrl: "localhost/callback",
                authorizationUrl: "auth.service/authorize",
                tokenUrl: "auth.service/token",
            },
        };
        const provider = new AuthProvider({
            id: entry.id,
            type: AuthProviderType.GITHUB,
            host: entry.host,
            oauth2Config: {
                clientId: entry.oauth?.clientId,
                clientSecret: entry.oauth?.clientSecret,
            },
            owner: {
                case: "organizationId",
                value: entry.organizationId!,
            },
        });
        it("should convert an auth provider", () => {
            const result = converter.toAuthProvider(entry);
            expect(result).to.deep.equal(provider);
        });
    });

    describe("toAuthProviderType", () => {
        const mapping: { [key: string]: number } = {
            GitHub: AuthProviderType.GITHUB,
            GitLab: AuthProviderType.GITLAB,
            Bitbucket: AuthProviderType.BITBUCKET,
            BitbucketServer: AuthProviderType.BITBUCKET_SERVER,
            Other: AuthProviderType.UNSPECIFIED,
        };
        it("should convert auth provider types", () => {
            for (const k of Object.getOwnPropertyNames(mapping)) {
                const result = converter.toAuthProviderType(k);
                expect(result).to.deep.equal(mapping[k]);
            }
        });
    });

    describe("toEnvironmentVariables", () => {
        const wsCtx: WithEnvvarsContext = {
            title: "title",
            envvars: [
                {
                    name: "FOO",
                    value: "bar",
                },
            ],
        };
        const envVars = [new EnvironmentVariable({ name: "FOO", value: "bar" })];
        it("should convert workspace environment variable types", () => {
            const result = converter.toEnvironmentVariables(wsCtx);
            expect(result).to.deep.equal(envVars);
        });
    });

    describe("toUserEnvironmentVariable", () => {
        const envVar: UserEnvVarValue = {
            id: "1",
            name: "FOO",
            value: "bar",
            repositoryPattern: "*/*",
        };
        const userEnvVar = new UserEnvironmentVariable({
            id: "1",
            name: "FOO",
            value: "bar",
            repositoryPattern: "*/*",
        });
        it("should convert user environment variable types", () => {
            const result = converter.toUserEnvironmentVariable(envVar);
            expect(result).to.deep.equal(userEnvVar);
        });
    });

    describe("toConfigurationEnvironmentVariable", () => {
        const envVar: ProjectEnvVar = {
            id: "1",
            name: "FOO",
            censored: true,
            projectId: "1",
        };
        const userEnvVar = new ConfigurationEnvironmentVariable({
            id: "1",
            name: "FOO",
            admission: EnvironmentVariableAdmission.PREBUILD,
            configurationId: "1",
        });
        it("should convert configuration environment variable types", () => {
            const result = converter.toConfigurationEnvironmentVariable(envVar);
            expect(result).to.deep.equal(userEnvVar);
        });
    });

    describe("toPrebuild", () => {
        it("should convert a prebuild", () => {
            const result = converter.toPrebuild({
                info: {
                    id: "5fba7d7c-e740-4339-b928-0e3c5975eb37",
                    buildWorkspaceId: "akosyakov-parceldemo-pzlbt0c1t2w",
                    teamId: "e13b09f1-19b9-413f-be18-181fe9316816",
                    userId: "8cccf1d0-2ed8-4d54-b141-f633f6008cd3",
                    projectName: "parcel-demo",
                    projectId: "8400828f-99bb-4758-a7d2-f25e88013823",
                    startedAt: "2023-11-17T10:42:00.000Z",
                    startedBy: "",
                    startedByAvatar: "",
                    cloneUrl: "https://github.com/akosyakov/parcel-demo.git",
                    branch: "master",
                    changeAuthor: "Anton Kosyakov",
                    changeAuthorAvatar: "https://avatars.githubusercontent.com/u/3082655?v=4",
                    changeDate: "2021-06-28T10:48:28Z",
                    changeHash: "60dbf818194082ef1a368bacd49cfd25a34c9256",
                    changeTitle: "add open/preview",
                    changeUrl: "https://github.com/akosyakov/parcel-demo/tree/master",
                },
                status: "building",
            });
            expect(result.toJson()).to.deep.equal({
                id: "5fba7d7c-e740-4339-b928-0e3c5975eb37",
                workspaceId: "akosyakov-parceldemo-pzlbt0c1t2w",
                configurationId: "8400828f-99bb-4758-a7d2-f25e88013823",
                ref: "master",
                commit: {
                    author: {
                        avatarUrl: "https://avatars.githubusercontent.com/u/3082655?v=4",
                        name: "Anton Kosyakov",
                    },
                    authorDate: "2021-06-28T10:48:28Z",
                    message: "add open/preview",
                    sha: "60dbf818194082ef1a368bacd49cfd25a34c9256",
                },
                contextUrl: "https://github.com/akosyakov/parcel-demo/tree/master",
                status: {
                    phase: {
                        name: "PHASE_BUILDING",
                    },
                    startTime: "2023-11-17T10:42:00Z",
                },
            });
        });
    });

    describe("toBlockedRepository", () => {
        it("should convert a token", () => {
            const t1 = new Date();
            const t2 = new Date();
            const repo: ProtocolBlockedRepository = {
                id: 2023,
                urlRegexp: "*/*",
                blockUser: false,
                createdAt: t1.toISOString(),
                updatedAt: t2.toISOString(),
            };
            const blockedRepo = new BlockedRepository({
                id: 2023,
                urlRegexp: "*/*",
                blockUser: false,
                creationTime: Timestamp.fromDate(new Date(repo.createdAt)),
                updateTime: Timestamp.fromDate(new Date(repo.updatedAt)),
            });
            expect(converter.toBlockedRepository(repo)).to.deep.equal(blockedRepo);
        });
    });

    describe("toBlockedEmailDomain", () => {
        it("should convert a token", () => {
            const item: EmailDomainFilterEntry = {
                domain: "example.com",
                negative: false,
            };
            const blockedEmail = new BlockedEmailDomain({
                id: "",
                domain: item.domain,
                negative: item.negative,
            });
            expect(converter.toBlockedEmailDomain(item)).to.deep.equal(blockedEmail);
        });
    });

    describe("toSCMToken", () => {
        it("should convert a token", () => {
            const t1 = new Date();
            const token: Token = {
                scopes: ["foo"],
                value: "secret",
                refreshToken: "refresh!",
                username: "root",
                idToken: "nope",
                expiryDate: t1.toISOString(),
                updateDate: t1.toISOString(),
            };
            expect(converter.toSCMToken(token).toJson()).to.deep.equal({
                expiryDate: t1.toISOString(),
                idToken: "nope",
                refreshToken: "refresh!",
                scopes: ["foo"],
                updateDate: t1.toISOString(),
                username: "root",
                value: "secret",
            });
        });
    });

    describe("toSuggestedRepository", () => {
        it("should convert a repo", () => {
            const repo: SuggestedRepository = {
                url: "https://github.com/gitpod-io/gitpod",
                projectId: "123",
                projectName: "Gitpod",
                repositoryName: "gitpod",
            };
            expect(converter.toSuggestedRepository(repo).toJson()).to.deep.equal({
                url: "https://github.com/gitpod-io/gitpod",
                configurationId: "123",
                configurationName: "Gitpod",
                repoName: "gitpod",
            });
        });
    });

    describe("errors", () => {
        it("USER_BLOCKED", () => {
            const connectError = converter.toError(new ApplicationError(ErrorCodes.USER_BLOCKED, "user blocked"));
            expect(connectError.code).to.equal(Code.PermissionDenied);
            expect(connectError.rawMessage).to.equal("user blocked");

            const details = connectError.findDetails(PermissionDeniedDetails)[0];
            expect(details).to.not.be.undefined;
            expect(details?.reason?.case).to.equal("userBlocked");
            expect(details?.reason?.value).to.be.instanceOf(UserBlockedError);

            const appError = converter.fromError(connectError);
            expect(appError.code).to.equal(ErrorCodes.USER_BLOCKED);
            expect(appError.message).to.equal("user blocked");
        });

        it("NEEDS_VERIFICATION", () => {
            const connectError = converter.toError(
                new ApplicationError(ErrorCodes.NEEDS_VERIFICATION, "needs verification"),
            );
            expect(connectError.code).to.equal(Code.PermissionDenied);
            expect(connectError.rawMessage).to.equal("needs verification");

            const details = connectError.findDetails(PermissionDeniedDetails)[0];
            expect(details).to.not.be.undefined;
            expect(details?.reason?.case).to.equal("needsVerification");
            expect(details?.reason?.value).to.be.instanceOf(NeedsVerificationError);

            const appError = converter.fromError(connectError);
            expect(appError.code).to.equal(ErrorCodes.NEEDS_VERIFICATION);
            expect(appError.message).to.equal("needs verification");
        });

        it("INVALID_GITPOD_YML", () => {
            const connectError = converter.toError(
                new InvalidGitpodYMLError({
                    violations: ['Invalid value: "": must not be empty'],
                }),
            );
            expect(connectError.code).to.equal(Code.FailedPrecondition);
            expect(connectError.rawMessage).to.equal('Invalid gitpod.yml: Invalid value: "": must not be empty');

            const details = connectError.findDetails(FailedPreconditionDetails)[0];
            expect(details).to.not.be.undefined;
            expect(details?.reason?.case).to.equal("invalidGitpodYml");
            expect(details?.reason?.value).to.be.instanceOf(InvalidGitpodYMLErrorData);

            let violations = (details?.reason?.value as InvalidGitpodYMLErrorData).violations;
            expect(violations).to.deep.equal(['Invalid value: "": must not be empty']);

            const appError = converter.fromError(connectError);
            expect(appError).to.be.instanceOf(InvalidGitpodYMLError);
            expect(appError.code).to.equal(ErrorCodes.INVALID_GITPOD_YML);
            expect(appError.message).to.equal('Invalid gitpod.yml: Invalid value: "": must not be empty');

            violations = (appError as InvalidGitpodYMLError).info.violations;
            expect(violations).to.deep.equal(['Invalid value: "": must not be empty']);
        });

        it("RepositoryNotFoundError", () => {
            const connectError = converter.toError(
                new RepositoryNotFoundError({
                    host: "github.com",
                    lastUpdate: "2021-06-28T10:48:28Z",
                    owner: "akosyakov",
                    userIsOwner: true,
                    userScopes: ["repo"],
                }),
            );
            expect(connectError.code).to.equal(Code.FailedPrecondition);
            expect(connectError.rawMessage).to.equal("Repository not found.");

            const details = connectError.findDetails(FailedPreconditionDetails)[0];
            expect(details).to.not.be.undefined;
            expect(details?.reason?.case).to.equal("repositoryNotFound");
            expect(details?.reason?.value).to.be.instanceOf(RepositoryNotFoundErrorData);

            let data = toPlainMessage(details?.reason?.value as RepositoryNotFoundErrorData);
            expect(data.host).to.equal("github.com");
            expect(data.lastUpdate).to.equal("2021-06-28T10:48:28Z");
            expect(data.owner).to.equal("akosyakov");
            expect(data.userIsOwner).to.equal(true);
            expect(data.userScopes).to.deep.equal(["repo"]);

            const appError = converter.fromError(connectError);
            expect(appError).to.be.instanceOf(RepositoryNotFoundError);
            expect(appError.code).to.equal(ErrorCodes.NOT_FOUND);
            expect(appError.message).to.equal("Repository not found.");

            data = (appError as RepositoryNotFoundError).info;
            expect(data.host).to.equal("github.com");
            expect(data.lastUpdate).to.equal("2021-06-28T10:48:28Z");
            expect(data.owner).to.equal("akosyakov");
            expect(data.userIsOwner).to.equal(true);
            expect(data.userScopes).to.deep.equal(["repo"]);
        });

        it("UnauthorizedRepositoryAccessError", () => {
            const connectError = converter.toError(
                new UnauthorizedRepositoryAccessError({
                    host: "github.com",
                    scopes: ["repo"],
                }),
            );
            expect(connectError.code).to.equal(Code.FailedPrecondition);
            expect(connectError.rawMessage).to.equal("Repository unauthorized.");

            const details = connectError.findDetails(FailedPreconditionDetails)[0];
            expect(details).to.not.be.undefined;
            expect(details?.reason?.case).to.equal("repositoryUnauthorized");
            expect(details?.reason?.value).to.be.instanceOf(RepositoryUnauthorizedErrorData);

            let data = toPlainMessage(details?.reason?.value as RepositoryUnauthorizedErrorData);
            expect(data.host).to.equal("github.com");
            expect(data.scopes).to.deep.equal(["repo"]);

            const appError = converter.fromError(connectError);
            expect(appError).to.be.instanceOf(UnauthorizedRepositoryAccessError);
            expect(appError.code).to.equal(ErrorCodes.NOT_AUTHENTICATED);
            expect(appError.message).to.equal("Repository unauthorized.");

            data = (appError as UnauthorizedRepositoryAccessError).info;
            expect(data.host).to.equal("github.com");
            expect(data.scopes).to.deep.equal(["repo"]);
        });

        it("PAYMENT_SPENDING_LIMIT_REACHED", () => {
            const connectError = converter.toError(
                new ApplicationError(ErrorCodes.PAYMENT_SPENDING_LIMIT_REACHED, "payment spending limit reached"),
            );
            expect(connectError.code).to.equal(Code.FailedPrecondition);
            expect(connectError.rawMessage).to.equal("payment spending limit reached");

            const details = connectError.findDetails(FailedPreconditionDetails)[0];
            expect(details).to.not.be.undefined;
            expect(details?.reason?.case).to.equal("paymentSpendingLimitReached");
            expect(details?.reason?.value).to.be.instanceOf(PaymentSpendingLimitReachedError);

            const appError = converter.fromError(connectError);
            expect(appError.code).to.equal(ErrorCodes.PAYMENT_SPENDING_LIMIT_REACHED);
            expect(appError.message).to.equal("payment spending limit reached");
        });

        it("INVALID_COST_CENTER", () => {
            const connectError = converter.toError(
                new ApplicationError(ErrorCodes.INVALID_COST_CENTER, "invalid cost center", {
                    attributionId: 12345,
                }),
            );
            expect(connectError.code).to.equal(Code.FailedPrecondition);
            expect(connectError.rawMessage).to.equal("invalid cost center");

            const details = connectError.findDetails(FailedPreconditionDetails)[0];
            expect(details).to.not.be.undefined;
            expect(details?.reason?.case).to.equal("invalidCostCenter");
            expect(details?.reason?.value).to.be.instanceOf(InvalidCostCenterError);

            let data = toPlainMessage(details?.reason?.value as InvalidCostCenterError);
            expect(data.attributionId).to.equal(12345);

            const appError = converter.fromError(connectError);
            expect(appError.code).to.equal(ErrorCodes.INVALID_COST_CENTER);
            expect(appError.message).to.equal("invalid cost center");

            data = appError.data;
            expect(data.attributionId).to.equal(12345);
        });

        it("HEADLESS_LOG_NOT_YET_AVAILABLE", () => {
            const connectError = converter.toError(
                new ApplicationError(ErrorCodes.HEADLESS_LOG_NOT_YET_AVAILABLE, "image build log not yet available"),
            );
            expect(connectError.code).to.equal(Code.FailedPrecondition);
            expect(connectError.rawMessage).to.equal("image build log not yet available");

            const details = connectError.findDetails(FailedPreconditionDetails)[0];
            expect(details).to.not.be.undefined;
            expect(details?.reason?.case).to.equal("imageBuildLogsNotYetAvailable");
            expect(details?.reason?.value).to.be.instanceOf(ImageBuildLogsNotYetAvailableError);

            const appError = converter.fromError(connectError);
            expect(appError.code).to.equal(ErrorCodes.HEADLESS_LOG_NOT_YET_AVAILABLE);
            expect(appError.message).to.equal("image build log not yet available");
        });

        it("TOO_MANY_RUNNING_WORKSPACES", () => {
            const connectError = converter.toError(
                new ApplicationError(ErrorCodes.TOO_MANY_RUNNING_WORKSPACES, "too many running workspaces"),
            );
            expect(connectError.code).to.equal(Code.FailedPrecondition);
            expect(connectError.rawMessage).to.equal("too many running workspaces");

            const details = connectError.findDetails(FailedPreconditionDetails)[0];
            expect(details).to.not.be.undefined;
            expect(details?.reason?.case).to.equal("tooManyRunningWorkspaces");
            expect(details?.reason?.value).to.be.instanceOf(TooManyRunningWorkspacesError);

            const appError = converter.fromError(connectError);
            expect(appError.code).to.equal(ErrorCodes.TOO_MANY_RUNNING_WORKSPACES);
            expect(appError.message).to.equal("too many running workspaces");
        });

        it("NOT_FOUND", () => {
            const connectError = converter.toError(new ApplicationError(ErrorCodes.NOT_FOUND, "not found"));
            expect(connectError.code).to.equal(Code.NotFound);
            expect(connectError.rawMessage).to.equal("not found");

            const appError = converter.fromError(connectError);
            expect(appError.code).to.equal(ErrorCodes.NOT_FOUND);
            expect(appError.message).to.equal("not found");
        });

        it("NOT_AUTHENTICATED", () => {
            const connectError = converter.toError(
                new ApplicationError(ErrorCodes.NOT_AUTHENTICATED, "not authenticated"),
            );
            expect(connectError.code).to.equal(Code.Unauthenticated);
            expect(connectError.rawMessage).to.equal("not authenticated");

            const appError = converter.fromError(connectError);
            expect(appError.code).to.equal(ErrorCodes.NOT_AUTHENTICATED);
            expect(appError.message).to.equal("not authenticated");
        });

        it("PERMISSION_DENIED", () => {
            const connectError = converter.toError(
                new ApplicationError(ErrorCodes.PERMISSION_DENIED, "permission denied"),
            );
            expect(connectError.code).to.equal(Code.PermissionDenied);
            expect(connectError.rawMessage).to.equal("permission denied");

            const appError = converter.fromError(connectError);
            expect(appError.code).to.equal(ErrorCodes.PERMISSION_DENIED);
            expect(appError.message).to.equal("permission denied");
        });

        it("CONFLICT", () => {
            const connectError = converter.toError(new ApplicationError(ErrorCodes.CONFLICT, "conflict"));
            expect(connectError.code).to.equal(Code.AlreadyExists);
            expect(connectError.rawMessage).to.equal("conflict");

            const appError = converter.fromError(connectError);
            expect(appError.code).to.equal(ErrorCodes.CONFLICT);
            expect(appError.message).to.equal("conflict");
        });

        it("PRECONDITION_FAILED", () => {
            const connectError = converter.toError(
                new ApplicationError(ErrorCodes.PRECONDITION_FAILED, "precondition failed"),
            );
            expect(connectError.code).to.equal(Code.FailedPrecondition);
            expect(connectError.rawMessage).to.equal("precondition failed");

            const appError = converter.fromError(connectError);
            expect(appError.code).to.equal(ErrorCodes.PRECONDITION_FAILED);
            expect(appError.message).to.equal("precondition failed");
        });

        it("TOO_MANY_REQUESTS", () => {
            const connectError = converter.toError(
                new ApplicationError(ErrorCodes.TOO_MANY_REQUESTS, "too many requests"),
            );
            expect(connectError.code).to.equal(Code.ResourceExhausted);
            expect(connectError.rawMessage).to.equal("too many requests");

            const appError = converter.fromError(connectError);
            expect(appError.code).to.equal(ErrorCodes.TOO_MANY_REQUESTS);
            expect(appError.message).to.equal("too many requests");
        });

        it("CANCELLED", () => {
            const connectError = converter.toError(new ApplicationError(ErrorCodes.CANCELLED, "cancelled"));
            expect(connectError.code).to.equal(Code.Canceled);
            expect(connectError.rawMessage).to.equal("cancelled");

            const appError = converter.fromError(connectError);
            expect(appError.code).to.equal(ErrorCodes.CANCELLED);
            expect(appError.message).to.equal("cancelled");
        });

        it("INTERNAL_SERVER_ERROR", () => {
            const connectError = converter.toError(
                new ApplicationError(ErrorCodes.INTERNAL_SERVER_ERROR, "internal server error"),
            );
            expect(connectError.code).to.equal(Code.Internal);
            expect(connectError.rawMessage).to.equal("internal server error");

            const appError = converter.fromError(connectError);
            expect(appError.code).to.equal(ErrorCodes.INTERNAL_SERVER_ERROR);
            expect(appError.message).to.equal("internal server error");
        });

        it("UNKNOWN", () => {
            // some errors are not really used by clients we turn them to unknown on API interface
            // and then to internal on the dashboard
            // we monitor such occurences via tests and observability and replace them with stanard codes or get rid of them
            const connectError = converter.toError(new ApplicationError(ErrorCodes.EE_FEATURE, "unknown"));
            expect(connectError.code).to.equal(Code.Unknown);
            expect(connectError.rawMessage).to.equal("unknown");

            const appError = converter.fromError(connectError);
            expect(appError.code).to.equal(ErrorCodes.INTERNAL_SERVER_ERROR);
            expect(appError.message).to.equal("unknown");
        });

        it("ConnectError", () => {
            const connectError = new ConnectError("already exists", Code.AlreadyExists);
            const error = converter.toError(connectError);
            expect(error).to.equal(connectError, "preserved on API");

            const appError = converter.fromError(connectError);
            expect(appError.code).to.equal(ErrorCodes.CONFLICT, "app error on dashboard");
            expect(appError.message).to.equal("already exists");
        });

        it("Any other error is internal", () => {
            const error = new Error("unknown");
            const connectError = converter.toError(error);
            expect(connectError.code).to.equal(Code.Internal);
            expect(connectError.rawMessage).to.equal("unknown");

            const appError = converter.fromError(connectError);
            expect(appError.code).to.equal(ErrorCodes.INTERNAL_SERVER_ERROR);
            expect(appError.message).to.equal("unknown");
        });
    });

    describe("toSSHPublicKey", () => {
        const envVar: UserSSHPublicKey = {
            id: "1",
            userId: "1",
            name: "FOO",
            key: "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDCnrN9UdK1bNGPmZfenTWXLuYYDjlYvZE8S+WOfP08WpR1GETzX5ZvgYOEZGwEE8KUPHC9cge4Hvo/ydIS9aqbZ5MiVGJ8cAIq1Ic89SjlDWU6fl8TwIqOPCi2imAASlEDP4q8vMLK1N6UOW1EVbxyL3uybGd10ysC1t1FxFPveIGNsYE/MOQeuEWS16AplpXYXIfVRSlgAskeBft2w8Ud3B4gNe8ECLA/FXu96UpvZkdtOarA3JZ9Z27GveNJg9Mtmmw0+US0KXiO9x9NyH7G8+mqVDwDY+nNvaFA5gtQxkkl/uY2oz9k/B4Rjlj3jOiUXe5uQs3XUm5m8g9a9fh62DabLpA2fEvtfg+a/VqNe52dNa5YjupwvBd6Inb5uMW/TYjNl6bNHPlXFKw/nwLOVzukpkjxMZUKS6+4BGkpoasj6y2rTU/wkpbdD8J7yjI1p6J9aKkC6KksIWgN7xGmHkv2PCGDqMHTNbnQyowtNKMgA/667vAYJ0qW7HAHBFXJRs6uRi/DI3+c1QV2s4wPCpEHDIYApovQ0fbON4WDPoGMyHd7kPh9xB/bX7Dj0uMXImu1pdTd62fQ/1XXX64+vjAAXS/P9RSCD0RCRt/K3LPKl2m7GPI3y1niaE52XhxZw+ms9ays6NasNVMw/ZC+f02Ti+L5FBEVf8230RVVRQ== notfound@gitpod.io",
            fingerprint: "ykjP/b5aqoa3envmXzWpPMCGgEFMu3QvubfSTNrJCMA=",
            creationTime: "2023-10-16T20:18:24.923Z",
            lastUsedTime: "2023-10-16T20:18:24.923Z",
        };
        const userEnvVar = new SSHPublicKey({
            id: "1",
            name: "FOO",
            key: "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDCnrN9UdK1bNGPmZfenTWXLuYYDjlYvZE8S+WOfP08WpR1GETzX5ZvgYOEZGwEE8KUPHC9cge4Hvo/ydIS9aqbZ5MiVGJ8cAIq1Ic89SjlDWU6fl8TwIqOPCi2imAASlEDP4q8vMLK1N6UOW1EVbxyL3uybGd10ysC1t1FxFPveIGNsYE/MOQeuEWS16AplpXYXIfVRSlgAskeBft2w8Ud3B4gNe8ECLA/FXu96UpvZkdtOarA3JZ9Z27GveNJg9Mtmmw0+US0KXiO9x9NyH7G8+mqVDwDY+nNvaFA5gtQxkkl/uY2oz9k/B4Rjlj3jOiUXe5uQs3XUm5m8g9a9fh62DabLpA2fEvtfg+a/VqNe52dNa5YjupwvBd6Inb5uMW/TYjNl6bNHPlXFKw/nwLOVzukpkjxMZUKS6+4BGkpoasj6y2rTU/wkpbdD8J7yjI1p6J9aKkC6KksIWgN7xGmHkv2PCGDqMHTNbnQyowtNKMgA/667vAYJ0qW7HAHBFXJRs6uRi/DI3+c1QV2s4wPCpEHDIYApovQ0fbON4WDPoGMyHd7kPh9xB/bX7Dj0uMXImu1pdTd62fQ/1XXX64+vjAAXS/P9RSCD0RCRt/K3LPKl2m7GPI3y1niaE52XhxZw+ms9ays6NasNVMw/ZC+f02Ti+L5FBEVf8230RVVRQ== notfound@gitpod.io",
            fingerprint: "ykjP/b5aqoa3envmXzWpPMCGgEFMu3QvubfSTNrJCMA=",
            creationTime: Timestamp.fromDate(new Date("2023-10-16T20:18:24.923Z")),
            lastUsedTime: Timestamp.fromDate(new Date("2023-10-16T20:18:24.923Z")),
        });
        it("should convert ssh public key variable types", () => {
            const result = converter.toSSHPublicKey(envVar);
            expect(result).to.deep.equal(userEnvVar);
        });
    });
});
