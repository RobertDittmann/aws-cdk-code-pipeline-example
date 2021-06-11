import * as cdk from '@aws-cdk/core';
import {NestedStackProps} from '@aws-cdk/core';
import * as S3 from '@aws-cdk/aws-s3';
import {BucketEncryption} from '@aws-cdk/aws-s3';


export interface S3BucketStackProps extends NestedStackProps {
    readonly stackName: string;
}

export class S3BucketNestedStack extends cdk.NestedStack {
    public readonly bucket: S3.Bucket;

    constructor(scope: cdk.Construct, id: string, props: S3BucketStackProps) {
        super(scope, id, props);

        this.bucket = new S3.Bucket(this, `Images`, {
            encryption: BucketEncryption.S3_MANAGED,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            bucketName: props.stackName + 'bucket',
            autoDeleteObjects: true
        });
    }
}
