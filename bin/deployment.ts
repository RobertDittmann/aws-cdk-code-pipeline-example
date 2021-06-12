#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import {InfrastructureStack} from '../lib/infrastructure-stack';
import {PipelineStack} from '../lib/pipeline-stack';

const REPO_TOKEN = process.env.GITHUB_TOKEN ? process.env.GITHUB_TOKEN : '';
const STACK_NAME = 'robertdittmann';

if (!REPO_TOKEN) {
    console.log("No Github Token present");
}

const app = new cdk.App();
const infrastructure = new InfrastructureStack(app, `InfrastructureStack`, {
    stackName: STACK_NAME+ '-infra',

});

new PipelineStack(app, 'PipelineStack', {
    githubToken: REPO_TOKEN,
    stackName: STACK_NAME + '-pipeline',
    lambdaCode: infrastructure.lambdaCode
});

app.synth();
