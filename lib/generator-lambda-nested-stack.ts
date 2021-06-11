import * as cdk from '@aws-cdk/core';
import {NestedStackProps} from '@aws-cdk/core';
import * as generatorLambda from '@aws-cdk/aws-lambda';
import * as S3 from '@aws-cdk/aws-s3';
import * as path from "path";
import {S3EventSource} from "@aws-cdk/aws-lambda-event-sources";
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as IAM from "@aws-cdk/aws-iam";
import {Effect} from "@aws-cdk/aws-iam";


export interface GeneratorLambdaStackProps extends NestedStackProps {
    readonly table: dynamodb.Table;
    readonly stackName: string;
    readonly bucket: S3.Bucket;
}

export class GeneratorLambdaNestedStack extends cdk.NestedStack {
    public readonly generatorLambdaIFunction: generatorLambda.IFunction;

    constructor(scope: cdk.Construct, id: string, props: GeneratorLambdaStackProps) {
        super(scope, id, props);

        const lambda = new generatorLambda.Function(this, `LambdaGenerator`, {
            runtime: generatorLambda.Runtime.NODEJS_14_X,
            handler: 'generator.handler',
            code: generatorLambda.Code.fromAsset(path.join(__dirname, '../src/lambda/celebrities')),
            environment: {
                'TABLE_NAME': props.table.tableName
            },
            functionName: props.stackName + '-generator'
        });

        props.table.grantWriteData(lambda);

        lambda.addEventSource(new S3EventSource(props.bucket, {
            events: [S3.EventType.OBJECT_CREATED_PUT]
        }));
        lambda.addToRolePolicy(new IAM.PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                'rekognition:RecognizeCelebrities'
            ],
            resources: ['*']
        }));

        // this is to avoid circular dependencies
        lambda.addToRolePolicy(new IAM.PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
                's3:GetObject*',
                's3:GetBucket*',
                's3:List*'
            ],
            resources: [
                `arn:aws:s3:::${props.bucket.bucketName}`,
                `arn:aws:s3:::${props.bucket.bucketName}/*`
            ]
        }));

        // props.bucket.grantRead(lambda); // circular so not working in here

        this.generatorLambdaIFunction = lambda;
    }
}


