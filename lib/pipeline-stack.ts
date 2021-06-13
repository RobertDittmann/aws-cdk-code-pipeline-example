import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import {GitHubTrigger} from '@aws-cdk/aws-codepipeline-actions';
import * as lambda from '@aws-cdk/aws-lambda';
import {App, SecretValue, Stack, StackProps} from '@aws-cdk/core';
import * as codebuild from '@aws-cdk/aws-codebuild';
import * as iam from '@aws-cdk/aws-iam';
import * as secrets from '@aws-cdk/aws-secretsmanager';

export interface PipelineStackProps extends StackProps {
    readonly githubToken: string;
    readonly envName: string;
    readonly lambdaCode: lambda.CfnParametersCode;
}

export class PipelineStack extends Stack {
    constructor(app: App, id: string, props: PipelineStackProps) {
        const stackName = props.envName + '-pipeline'
        super(app, id, {
            stackName: stackName,
            ...props});

        const cdkBuild = new codebuild.PipelineProject(this, 'CdkBuild', {
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
                            'npm run cdk synth InfrastructureStack', // removed " -- -o dist"
                            'ls'
                        ],
                    },
                },
                // artifacts: {
                //     'base-directory': 'dist',
                //     files: [
                //         'InfrastructureStack*',
                //         'tree.json',
                //         'manifest.json',
                //         'cdk.out'
                //     ],
                // },
            }),
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
            },
        });


        const pipelineTemplateBuild = new codebuild.PipelineProject(this, 'pipelineTemplateBuild', {
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
                            'npm run cdk synth PipelineStack -- -o pipeline_template', // removed " -- -o dist"
                            'ls'
                        ],
                    },
                },
                artifacts: {
                    'base-directory': 'pipeline_template',
                    files: [
                        'PipelineStack*'
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

        const lambdaBuild2 = new codebuild.PipelineProject(this, 'LambdaBuild2', {
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

        const adminDeploy = new iam.Role(this, 'AdminDeploy', {
            assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com')
        })
        adminDeploy.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'));

        const awsCDKDeploy = new codebuild.PipelineProject(this, 'AwsCDKDeploy', {
            buildSpec: codebuild.BuildSpec.fromObject({
                version: '0.2',
                phases: {
                    install: {
                        commands: 'npm install',
                    },
                    build: {
                        commands: [
                            'ls',
                            'npm run cdk deploy InfrastructureStack'
                        ],
                    }
                }
            }),
            role: adminDeploy,
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
            },
        });

        const sourceOutput = new codepipeline.Artifact();
        const cdkBuildOutput = new codepipeline.Artifact('CdkBuildOutput');
        const lambdaBuildOutput = new codepipeline.Artifact('LambdaBuildOutput');
        const lambdaBuildOutput2 = new codepipeline.Artifact('LambdaBuildOutput2');
        const pipelineBuildOutput = new codepipeline.Artifact('PipelineBuildOutput');


        const token = secrets.Secret.fromSecretNameV2(this, "ImportedSecret", 'RobertDittmannGithubToken')
            .secretValue.toString();

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
                    stageName: 'Pipeline_UPDATE',
                    actions: [
                        new codepipeline_actions.CloudFormationCreateUpdateStackAction({
                            actionName: 'Pipeline_UPDATE',
                            templatePath: pipelineBuildOutput.atPath('PipelineStack.template.json'),
                            stackName: stackName,
                            adminPermissions: true,
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
                        //     templatePath: cdkBuildOutput.atPath('InfrastructureStack.template.json'),
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
