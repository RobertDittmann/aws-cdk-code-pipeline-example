import * as cdk from '@aws-cdk/core';
import {NestedStackProps} from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as path from "path";

export interface EndpointLambdaStackProps extends NestedStackProps {
    readonly table: dynamodb.Table;
    readonly stackName: string;
}

export class EndpointLambdaNestedStack extends cdk.NestedStack {
    public readonly endpointLambdaIFunction: lambda.IFunction;
    public readonly lambdaCode: lambda.CfnParametersCode;

    constructor(scope: cdk.Construct, id: string, props: EndpointLambdaStackProps) {
        super(scope, id, props);

        // this.lambdaCode = lambda.Code.fromCfnParameters(); // COMMENT OUT TO CHECK

        const lambdaFn = new lambda.Function(this, `LambdaEndpoint`, {
            runtime: lambda.Runtime.NODEJS_14_X,
            handler: 'endpoint.handler',
            code: lambda.Code.fromAsset(path.join(__dirname, '../src/lambda/celebrities')),
            environment: {
                'TABLE_NAME': props.table.tableName
            },
            functionName: props.stackName + '-endpoint'
        });

        props.table.grantReadData(lambdaFn);
        this.endpointLambdaIFunction = lambdaFn;
    }
}
