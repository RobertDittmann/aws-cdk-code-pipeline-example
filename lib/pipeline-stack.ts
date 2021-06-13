import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import {GitHubTrigger} from '@aws-cdk/aws-codepipeline-actions';
import * as lambda from '@aws-cdk/aws-lambda';
import {App, SecretValue, Stack, StackProps} from '@aws-cdk/core';
import * as codebuild from '@aws-cdk/aws-codebuild';
import * as iam from '@aws-cdk/aws-iam';
import * as secrets from '@aws-cdk/aws-secretsmanager';
import * as S3 from "@aws-cdk/aws-s3";
import {BucketEncryption} from "@aws-cdk/aws-s3";
import * as cdk from "@aws-cdk/core";

export interface PipelineStackProps extends StackProps {
    readonly envName: string;
    readonly lambdaCode: lambda.CfnParametersCode;
}

export class PipelineStack extends Stack {
    constructor(app: App, id: string, props: PipelineStackProps) {
        const stackName = props.envName + '-pipeline'
        super(app, id, {
            stackName: stackName,
            ...props});

        const pipelineArtifactsBucket = new S3.Bucket(this, `${props.envName}-pipeline-artifacts`, {
            encryption: BucketEncryption.S3_MANAGED,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            bucketName: `${props.envName}-pipeline-artifacts`,
            autoDeleteObjects: true
        });

        const cdkBuild = new codebuild.PipelineProject(this, `${props.envName}-InfrastructureBuild`, {
            buildSpec: codebuild.BuildSpec.fromObject({
                version: '0.2',
                phases: {
                    install: {
                        commands: 'npm install',
                    },
                    build: {
                        commands: [
                            'ls',
                            'npm run build',
                            `npm run cdk synth ${props.envName}-Infrastructure`, // removed " -- -o dist"
                            'ls'
                        ],
                    },
                },
            }),
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
            },
        });


        const pipelineTemplateBuild = new codebuild.PipelineProject(this, `${props.envName}-PipelineBuild`, {
            buildSpec: codebuild.BuildSpec.fromObject({
                version: '0.2',
                phases: {
                    install: {
                        commands: 'npm install',
                    },
                    build: {
                        commands: [
                            'ls',
                            'npm run build',
                            `npm run cdk synth ${props.envName}-Pipeline -- -o pipeline_template`, // removed " -- -o dist"
                            'ls'
                        ],
                    },
                },
                artifacts: {
                    'base-directory': 'pipeline_template',
                    files: [
                        `${props.envName}-Pipeline*`
                    ],
                },
            }),
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
            },
        });

        const lambdaBuild = new codebuild.PipelineProject(this, `${props.envName}-EndpointLambdaBuild`, {
            buildSpec: codebuild.BuildSpec.fromObject({
                version: '0.2',
                phases: {
                    install: {
                        commands: [
                            'ls',
                            'cd src/lambda/celebrities',
                            'ls',
                            'npm install',
                            'ls',
                            'cd ../../..',
                            'ls',
                            'cd src/lambda/celebrities',
                        ],
                    },
                    build: {
                        commands: 'npm run build',
                    },
                },
                artifacts: {
                    'base-directory': 'src/lambda/celebrities',
                    files: [
                        'endpoint.js',
                        'node_modules/**/*',
                    ],
                },
            }),
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
            },
        });

        const lambdaBuild2 = new codebuild.PipelineProject(this, `${props.envName}-LambdaBuild2`, {
            buildSpec: codebuild.BuildSpec.fromObject({
                version: '0.2',
                phases: {
                    install: {
                        commands: [
                            'ls',
                            'cd src/lambda/celebrities',
                            'ls',
                            'npm install',
                            'ls',
                            'cd ../../..',
                            'ls',
                            'cd src/lambda/celebrities',
                        ],
                    },
                    build: {
                        commands: 'npm run build',
                    },
                },
                artifacts: {
                    'base-directory': 'src/lambda/celebrities',
                    files: [
                        'endpoint.js',
                        'node_modules/**/*',
                    ],
                },
            }),
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
            },
        });

        const adminRoleForCodeBuild = new iam.Role(this, `${props.envName}-AdminCodeBuildRole`, {
            assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com')
        })
        adminRoleForCodeBuild.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'));

        const adminRoleForCodePipeline = new iam.Role(this, `${props.envName}-AdminCodePipelineRole`, {
            assumedBy: new iam.ServicePrincipal('codepipeline.amazonaws.com')
        })
        adminRoleForCodePipeline.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'));

        const awsCDKDeploy = new codebuild.PipelineProject(this, `${props.envName}-InfrastructureDeploy`, {
            buildSpec: codebuild.BuildSpec.fromObject({
                version: '0.2',
                phases: {
                    install: {
                        commands: 'npm install',
                    },
                    build: {
                        commands: [
                            'ls',
                            `npm run cdk deploy ${props.envName}-Infrastructure`
                        ],
                    }
                }
            }),
            role: adminRoleForCodeBuild,
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
            },
        });

        const sourceOutput = new codepipeline.Artifact(`${props.envName}-Source`);
        const cdkBuildOutput = new codepipeline.Artifact(`${props.envName}-CdkBuildOutput`);
        const lambdaBuildOutput = new codepipeline.Artifact(`${props.envName}-LambdaBuildOutput`);
        const lambdaBuildOutput2 = new codepipeline.Artifact(`${props.envName}-LambdaBuildOutput2`);
        const pipelineBuildOutput = new codepipeline.Artifact(`${props.envName}-PipelineBuildOutput`);


        const token = secrets.Secret.fromSecretNameV2(this, `${props.envName}-ImportedSecret`, 'RobertDittmannGithubToken')
            .secretValue.toString();

        new codepipeline.Pipeline(this, `${props.envName}-Pipeline`, {
            pipelineName: `${props.envName}-Pipeline`,
            artifactBucket: pipelineArtifactsBucket,
            role: adminRoleForCodePipeline,
            stages: [
                {
                    stageName: 'Source',
                    actions: [
                        new codepipeline_actions.GitHubSourceAction({
                            owner: 'RobertDittmann',
                            repo: 'aws-cdk-code-pipeline-example',
                            branch: 'master',
                            actionName: 'PULL_SOURCE',
                            output: sourceOutput,
                            trigger: GitHubTrigger.POLL,
                            oauthToken: SecretValue.plainText(token)
                        }),
                    ],
                },
                {
                    stageName: 'Pipeline_build',
                    actions: [
                        new codepipeline_actions.CodeBuildAction({
                            actionName: 'Pipeline_Build',
                            project: pipelineTemplateBuild,
                            input: sourceOutput,
                            outputs: [pipelineBuildOutput],
                            environmentVariables: {ENV_NAME: {value: props.envName}}
                        }),
                    ],
                },
                {
                    stageName: 'Pipeline_Update',
                    actions: [
                        new codepipeline_actions.CloudFormationCreateUpdateStackAction({
                            actionName: 'Pipeline_UPDATE',
                            templatePath: pipelineBuildOutput.atPath('Pipeline.template.json'),
                            stackName: stackName,
                            adminPermissions: true
                        }),
                    ],
                },
                {
                    stageName: 'Build',
                    actions: [
                        new codepipeline_actions.CodeBuildAction({
                            actionName: 'Lambda_Build',
                            project: lambdaBuild,
                            input: sourceOutput,
                            outputs: [lambdaBuildOutput],
                        }),
                        // new codepipeline_actions.CodeBuildAction({
                        //     actionName: 'Lambda_Build_2',
                        //     project: lambdaBuild2,
                        //     input: sourceOutput,
                        //     outputs: [lambdaBuildOutput2],
                        // }),
                        new codepipeline_actions.CodeBuildAction({
                            actionName: 'Infrastructure_Build',
                            project: cdkBuild,
                            input: sourceOutput,
                            outputs: [cdkBuildOutput],
                            environmentVariables: {ENV_NAME: {value: props.envName}}
                        }),
                    ],
                },
                {
                    stageName: 'Deploy',
                    actions: [
                        // new codepipeline_actions.CloudFormationCreateUpdateStackAction({
                        //     actionName: 'Infrastructure_CFN_Deploy',
                        //     templatePath: cdkBuildOutput.atPath('Infrastructure.template.json'),
                        //     stackName: 'InfrastructureDeploymentStack',
                        //     adminPermissions: true,
                        //     // parameterOverrides: {
                        //     //     ...props.lambdaCode.assign(lambdaBuildOutput.s3Location),
                        //     // }, // COMMENT OUT TO CHECK
                        //     extraInputs: [lambdaBuildOutput],
                        // }),

                        new codepipeline_actions.CodeBuildAction({
                            actionName: 'Infrastructure_AWS_CDK_Deploy',
                            input: sourceOutput,
                            project: awsCDKDeploy,
                            environmentVariables: {ENV_NAME: {value: props.envName}}
                        })
                    ],
                },
            ],
        });
    }
}
