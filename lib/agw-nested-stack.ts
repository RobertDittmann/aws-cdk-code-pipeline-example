import * as cdk from '@aws-cdk/core';
import {NestedStackProps} from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import {HttpApi, HttpMethod} from '@aws-cdk/aws-apigatewayv2';
import * as integration from "@aws-cdk/aws-apigatewayv2-integrations";

export interface AgwStackStackProps extends NestedStackProps {
    readonly endpointLambdaIFunction: lambda.IFunction;
    readonly stackName: string;
}

export class AgwNestedStack extends cdk.NestedStack {
    constructor(scope: cdk.Construct, id: string, props: AgwStackStackProps) {
        super(scope, id, props);

        const httpApi = new HttpApi(this, `agw2`);

        httpApi.addRoutes({
            path: `/${props.stackName}-metadata-api/{id}`,
            methods: [HttpMethod.GET],
            integration: new integration.LambdaProxyIntegration({
                handler: props.endpointLambdaIFunction
            })
        });

        httpApi.addStage(`${props.stackName}-stage`, {
            stageName: `${props.stackName}-metadata-api`,
            autoDeploy: true
        });
    }
}
