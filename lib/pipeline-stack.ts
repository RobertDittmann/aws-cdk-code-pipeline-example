import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import {GitHubTrigger} from '@aws-cdk/aws-codepipeline-actions';
import * as lambda from '@aws-cdk/aws-lambda';
import {App, SecretValue, Stack, StackProps} from '@aws-cdk/core';
import * as codebuild from '@aws-cdk/aws-codebuild';

export interface PipelineStackProps extends StackProps {
    readonly githubToken: string;
    readonly stackName: string;
    readonly lambdaCode: lambda.CfnParametersCode;
}

export class PipelineStack extends Stack {
    constructor(app: App, id: string, props: PipelineStackProps) {
        super(app, id, props);

        const cdkBuild = new codebuild.PipelineProject(this, 'CdkBuild', {
            buildSpec: codebuild.BuildSpec.fromObject({
                version: '0.2',
                phases: {
                    install: {
                        commands: 'npm install',
                    },
                    build: {
                        commands: [
                            'npm run build',
                            'npm run cdk synth -- -o dist'
                        ],
                    },
                },
                artifacts: {
                    'base-directory': 'dist',
                    files: [
                        'Infrastructure.template.json',
                    ],
                },
            }),
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
            },
        });

        const lambdaBuild = new codebuild.PipelineProject(this, 'LambdaBuild', {
            buildSpec: codebuild.BuildSpec.fromObject({
                version: '0.2',
                phases: {
                    install: {
                        commands: [
                            'cd scr/lambda/celebrities',
                            'npm install',
                        ],
                    },
                    build: {
                        commands: 'npm run build',
                    },
                },
                artifacts: {
                    'base-directory': 'lambdaBuild',
                    files: [
                        'endpoint.js',
                        'node_modules/**/*',
                    ],
                },
            }),
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_2_0,
            },
        });


        const sourceOutput = new codepipeline.Artifact();
        const cdkBuildOutput = new codepipeline.Artifact('CdkBuildOutput');
        const lambdaBuildOutput = new codepipeline.Artifact('LambdaBuildOutput');


        new codepipeline.Pipeline(this, 'Pipeline', {
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
                            oauthToken: SecretValue.plainText(props.githubToken)
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
                        new codepipeline_actions.CodeBuildAction({
                            actionName: 'Infrastructure_Build',
                            project: cdkBuild,
                            input: sourceOutput,
                            outputs: [cdkBuildOutput],
                        }),
                    ],
                },
                {
                    stageName: 'Deploy',
                    actions: [
                        new codepipeline_actions.CloudFormationCreateUpdateStackAction({
                            actionName: 'Infrastructure_CFN_Deploy',
                            templatePath: cdkBuildOutput.atPath('Infrastructure.template.json'),
                            stackName: 'InfrastructureDeploymentStack',
                            adminPermissions: true,
                            parameterOverrides: {
                                ...props.lambdaCode.assign(lambdaBuildOutput.s3Location),
                            },
                            extraInputs: [lambdaBuildOutput],
                        }),
                    ],
                },
            ],
        });
    }
}
