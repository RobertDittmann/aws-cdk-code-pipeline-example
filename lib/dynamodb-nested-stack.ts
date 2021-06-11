import * as cdk from '@aws-cdk/core';
import {NestedStackProps, RemovalPolicy} from '@aws-cdk/core';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import {BillingMode} from '@aws-cdk/aws-dynamodb';

export interface DynamodbStackProps extends NestedStackProps {
    readonly stackName: string;
}

export class DynamodbNestedStack extends cdk.NestedStack {
    public readonly table: dynamodb.Table;

    constructor(scope: cdk.Construct, id: string, props: DynamodbStackProps) {
        super(scope, id, props);

        this.table = new dynamodb.Table(this, `Table`, {
            partitionKey: {name: 'id', type: dynamodb.AttributeType.STRING},
            billingMode: BillingMode.PAY_PER_REQUEST,
            tableName: props.stackName + '-Table',
            removalPolicy: RemovalPolicy.DESTROY,
        });
    }
}
