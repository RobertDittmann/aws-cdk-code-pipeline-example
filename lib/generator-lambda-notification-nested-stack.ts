import * as cdk from '@aws-cdk/core';
import {NestedStackProps} from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as S3 from '@aws-cdk/aws-s3';


export interface GeneratorLambdaNotificationStackProps extends NestedStackProps {
    readonly generatorLambdaIFunction: lambda.IFunction
    readonly bucket: S3.Bucket;
}

export class GeneratorLambdaNotificationStack extends cdk.NestedStack {
    constructor(scope: cdk.Construct, id: string, props: GeneratorLambdaNotificationStackProps) {
        super(scope, id, props);

        // issues with CIRCULAR

        // props.generatorLambdaIFunction.addEventSource(new S3EventSource(props.bucket, {
        //     events: [S3.EventType.OBJECT_CREATED_PUT]
        // }));

        // props.bucket.addEventNotification(S3.EventType.OBJECT_CREATED_PUT, new s3n.LambdaDestination(props.generatorLambdaIFunction));
    }
}


