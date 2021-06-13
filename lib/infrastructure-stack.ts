import {Construct, NestedStackProps, Stack} from '@aws-cdk/core';
import {S3BucketNestedStack} from "./s3-bucket-nested-stack";
import {DynamodbNestedStack} from "./dynamodb-nested-stack";
import {EndpointLambdaNestedStack} from "./endpoint-lambda-nested-stack";
import {GeneratorLambdaNestedStack} from "./generator-lambda-nested-stack";
import {AgwNestedStack} from "./agw-nested-stack";
import * as lambda from '@aws-cdk/aws-lambda';

export interface InfrastructureStackProps extends NestedStackProps {
    readonly envName: string;
}

export class InfrastructureStack extends Stack {
    public readonly lambdaCode: lambda.CfnParametersCode;

    constructor(app: Construct, id: string, props: InfrastructureStackProps) {
        const stackName = props.envName + '-infra'
        super(app, id, {
            stackName: stackName,
            ...props});

        const s3Stack = new S3BucketNestedStack(this, `ImagesS3Bucket`, {
            stackName: stackName
        });

        const dynamodbStack = new DynamodbNestedStack(this, `ImagesRekoginitionResults`, {
            stackName: stackName,
        });

        const endpointLambdaStack = new EndpointLambdaNestedStack(this, `EndpointLambda`, {
            stackName: stackName,
            table: dynamodbStack.table
        });

        this.lambdaCode = endpointLambdaStack.lambdaCode;

        const generatorLambdaStack = new GeneratorLambdaNestedStack(this, `GeneratorLambda`, {
            stackName: stackName,
            table: dynamodbStack.table,
            bucket: s3Stack.bucket,
        });

        // new GeneratorLambdaNotificationStack(this, 'GeneratorLambdaNotification', {
        //     generatorLambdaIFunction: generatorLambdaStack.generatorLambdaIFunction,
        //     bucket: s3Stack.bucket
        // })

        new AgwNestedStack(this, `Agw`, {
            endpointLambdaIFunction: endpointLambdaStack.endpointLambdaIFunction,
            stackName: stackName,
        });

    }
}
