
from ml_model import MLModel
import matplotlib.pyplot as plt
import pandas as pd
import sys
import os
from generate_training_data import GenerateTrainingData

def plot_all(predictions, test_data, epochs, instance, product, zone):

    #plt.ylim(1.2,1.3)
    plt.plot(test_data, color='blue', label='Actual EC2 Price')
    plt.plot(predictions, color='red', label='Predicted EC2 Price')
    plt.title(instance+' '+product+' '+zone+' - ' + str(epochs) + ' Epochs')
    plt.xlabel('Date')
    plt.ylabel('EC2 Price')
    plt.legend()
    plt.show()


def replace_name(name):

    if(name == 'Linux/UNIX'):
        return 'Linux-Unix'

    if(name == 'Red Hat Enterprise Linux'):
        return 'RedHat'

    if(name == 'SUSE Linux'):
        return 'Linux-Suse'

    return name

def main():

    if(len(sys.argv) != 6):
        print("Five Arguments needed! How to: python3 predict_ml_model.py <instanceType> <productDescription> <id> <region> <test run = 1 or actual run = 2>")
        exit(0)

    version = int(sys.argv[5])

    if(version != 1 and version != 2):
        print("Last argument has to be 1 or 2")
        exit(0)

    region = str(sys.argv[4])
    instance_type = str(sys.argv[1])
    product_description = str(sys.argv[2])
    image_id = str(sys.argv[3])
    
    path = os.path.normpath(os.getcwd() + os.sep + os.pardir)
    training_file = path + '/backend/training_data/'+instance_type+'_'+replace_name(product_description)+'_v2.csv'
    gen = GenerateTrainingData(training_file)
    if(gen.generate(instance_type, product_description) == 0):
        exit(0)
        

    df = pd.read_csv(training_file, sep=',')

    zones = None
    if (region == 'worldwide'):
        zones = df['AvailabilityZone'].drop_duplicates().values
        #zones = ['ap-northeast-1a', 'eu-west-3a']
    else:
        all_zones = df['AvailabilityZone'].drop_duplicates().values
        zones = [s for s in all_zones if region in s]

    rep_product_description = replace_name(product_description)
    
    file_name = 'predictions/'+instance_type+'_'+rep_product_description+'_'+image_id+'.csv'
    try:
        if(os.path.isfile(file_name)):
            df_old = pd.read_csv(file_name, sep=',')
        else:
            df_old = pd.Series([])
        #os.remove(file_name)
    except:
        df_old = pd.Series([])
        pass

    print(zones)
    list1 = []
    list2 = []
    for x in zones:
    #for x in ['ap-southeast-1b']:

        try:
            architecture_name = instance_type + '_' + rep_product_description + '_' + str(x) + '_architecture.json'
            weights_name = instance_type + '_' + rep_product_description + '_' + str(x) + '_weights.h5'
            mlobj = MLModel(weights_name, architecture_name, instance_type, rep_product_description, region)
            model = mlobj.load_model()
            model.compile(optimizer='nadam', loss='mean_squared_error', metrics=['accuracy'])

            training_features, labels, scaler = mlobj.generate_training_data(df, x, version, 0) #only needed for the scaler

            prediction = 0

            if(version == 1):
                test_predictions, test_data = mlobj.predict_testdata(df, scaler, x) #predict test data
                prediction = sum(test_predictions)
                sum_test = sum(test_data[:, 0])
                print(test_data[:,0])
                print(test_predictions)
                mse_outcome, mae_outcome, mape_outcome = mlobj.getErrors(test_predictions, test_data[:,0])
                print(round(mape_outcome, 4), round(sum_test, 4), round(prediction, 4), round(prediction - sum_test, 4))
                plot_all(test_predictions, test_data[:, 0], 250, instance_type, product_description, x)
            elif(version == 2):
                future_predictions = mlobj.predict_future(df, scaler, x)   #predict future
                prediction = sum(future_predictions)
                list1.append(round(prediction, 4))
                list2.append(x)
                #with open(file_name, 'a+') as f:
                #    f.write("%s,%s\n" % (round(prediction, 4), x))


      

        except:
            print('Skip', str(x))

    pd_series1 = pd.Series(list1)
    pd_series2 = pd.Series(list2)
    if(len(df_old) == 0):
        df_old = pd.concat([pd_series1, pd_series2], axis=1)
    else:
        df_old = pd.concat([df_old, pd_series1, pd_series2], axis=1)
    print(df_old)
    df_old.to_csv(file_name, index=False)
        #with open(file_name, 'a+') as f:
                #    f.write("%s,%s\n" % (round(prediction, 4), x))
    exit(0)

if __name__ == "__main__":
    main()
